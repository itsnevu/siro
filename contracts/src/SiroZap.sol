// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISwapRouter02} from "./UniswapV3Adapter.sol";

interface IWETH9 { function deposit() external payable; }
interface IVaultFactory { function isVault(address vault) external view returns (bool); }

/// Swap any whitelisted token (or native ETH) into a SIRO vault's deposit asset
/// through Uniswap v3 SwapRouter02, then deposit for `receiver`, in one transaction.
///
/// This is the user-facing zap. It is separate from UniswapV3Adapter, which is the
/// vault-internal trade route called by vault executors; the two do not share state.
/// The zap never holds funds between calls: any balance it starts a call with is
/// ignored, and it measures every amount by balance delta.
contract SiroZap is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISwapRouter02 public immutable router;
    IWETH9 public immutable weth;
    IVaultFactory public immutable factory;

    /// Input tokens the zap accepts. Native ETH is accepted when WETH is whitelisted.
    mapping(address => bool) public isWhitelisted;

    error DeadlinePassed();
    error TokenNotWhitelisted();
    error SlippageExceeded();
    error ZeroAmount();
    error SharesBelowMinimum();
    error VaultNotRecognized();
    error InvalidFee();
    error InvalidValue();
    error InvalidAddress();
    error SameToken();
    error UnsupportedToken();

    event WhitelistSet(address indexed token, bool allowed);
    event Zapped(
        address indexed sender,
        address indexed vault,
        address indexed receiver,
        address tokenIn,
        uint256 amountIn,
        uint256 assetsDeposited,
        uint256 shares
    );

    constructor(address owner_, ISwapRouter02 router_, IWETH9 weth_, IVaultFactory factory_) Ownable(owner_) {
        if (address(router_).code.length == 0 || address(weth_).code.length == 0 || address(factory_).code.length == 0) {
            revert InvalidAddress();
        }
        router = router_;
        weth = weth_;
        factory = factory_;
    }

    function setWhitelisted(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        isWhitelisted[token] = allowed;
        emit WhitelistSet(token, allowed);
    }

    /// @param vault       SIRO vault created by `factory`; its `asset()` is the swap output.
    /// @param tokenIn     Input token, or address(0) for native ETH (msg.value must equal amountIn).
    /// @param poolFee     Uniswap v3 fee tier: 100, 500, 3000 or 10000.
    /// @param minOut      Minimum vault asset received from the swap.
    /// @param minSharesOut Minimum vault shares minted to `receiver`.
    function swapAndDeposit(
        address vault,
        address tokenIn,
        uint256 amountIn,
        uint24 poolFee,
        uint256 minOut,
        uint256 minSharesOut,
        uint256 deadline,
        address receiver
    ) external payable nonReentrant returns (uint256 shares) {
        // forge-lint: disable-next-line(block-timestamp) user-chosen deadline; seconds of skew are acceptable
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (amountIn == 0) revert ZeroAmount();
        if (receiver == address(0)) revert InvalidAddress();
        if (poolFee != 100 && poolFee != 500 && poolFee != 3000 && poolFee != 10000) revert InvalidFee();
        if (!factory.isVault(vault)) revert VaultNotRecognized();

        IERC20 assetOut = IERC20(IERC4626(vault).asset());
        (uint256 spent, uint256 received) = _swapIn(tokenIn, amountIn, poolFee, minOut, assetOut);

        assetOut.forceApprove(vault, received);
        shares = IERC4626(vault).deposit(received, receiver);
        assetOut.forceApprove(vault, 0);
        if (shares < minSharesOut) revert SharesBelowMinimum();

        // forge-lint: disable-next-line(reentrancy-events) whole call is nonReentrant
        emit Zapped(msg.sender, vault, receiver, tokenIn, spent, received, shares);
    }

    /// Pulls (or wraps) the input, swaps it into `assetOut`, refunds unspent input to the
    /// caller (as WETH for native callers), and returns what was spent and received.
    function _swapIn(address tokenIn, uint256 amountIn, uint24 poolFee, uint256 minOut, IERC20 assetOut)
        private returns (uint256 spent, uint256 received)
    {
        bool isNative = tokenIn == address(0);
        IERC20 input = IERC20(isNative ? address(weth) : tokenIn);
        if (!isWhitelisted[address(input)]) revert TokenNotWhitelisted();
        if (address(input) == address(assetOut)) revert SameToken();

        uint256 inputBefore = input.balanceOf(address(this));
        uint256 outputBefore = assetOut.balanceOf(address(this));

        if (isNative) {
            if (msg.value != amountIn) revert InvalidValue();
            weth.deposit{value: amountIn}();
        } else {
            if (msg.value != 0) revert InvalidValue();
            input.safeTransferFrom(msg.sender, address(this), amountIn);
        }
        // Fee-on-transfer and rebasing inputs would make amountIn a lie; reject them.
        // forge-lint: disable-next-line(incorrect-strict-equality) exact match is the point: rejects fee-on-transfer
        if (input.balanceOf(address(this)) - inputBefore != amountIn) revert UnsupportedToken();

        input.forceApprove(address(router), amountIn);
        // Output is measured by balance delta below, not the router's return value.
        // forge-lint: disable-start(unused-return)
        router.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: address(input),
                tokenOut: address(assetOut),
                fee: poolFee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        // forge-lint: disable-end(unused-return)
        input.forceApprove(address(router), 0);

        // Trust balances, not the router's return value.
        received = assetOut.balanceOf(address(this)) - outputBefore;
        if (received < minOut || received == 0) revert SlippageExceeded();

        // SwapRouter02 exactInputSingle normally consumes everything; this is a guard.
        uint256 leftover = input.balanceOf(address(this)) - inputBefore;
        if (leftover != 0) input.safeTransfer(msg.sender, leftover);
        spent = amountIn - leftover;
    }
}
