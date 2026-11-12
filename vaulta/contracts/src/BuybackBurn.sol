// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IGuardedRouter} from "./interfaces/IGuardedRouter.sol";
import {ITwapOracle} from "./interfaces/ITwapOracle.sol";

/// @title BuybackBurn
/// @notice Receives the buyback share of protocol fees, swaps it for the protocol token and sends the
///         proceeds to the dead address. Anyone can trigger it; nobody can withdraw from it.
/// @dev Sandwich protection: the caller's `minOut` must be at least the 30-minute TWAP quote minus
///      `maxSlippageBps`. A caller cannot pass a low `minOut` to let the swap be front-run, and a
///      buy that is too large for the pool simply reverts until it is split into smaller ones.
///      There is no owner and no configuration after deployment.
contract BuybackBurn is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_SLIPPAGE_BPS_CEILING = 500;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IERC20 public immutable protocolToken;
    IGuardedRouter public immutable router;
    ITwapOracle public immutable twap;
    uint16 public immutable maxSlippageBps;

    /// @notice Protocol tokens this contract has sent to the dead address.
    uint256 public totalBurned;

    error ZeroAddress();
    error InvalidSlippage();
    error ZeroAmount();
    error CannotSwapProtocolToken();
    error MinOutBelowTwapFloor(uint256 minOut, uint256 floor);
    error InsufficientOutput(uint256 received, uint256 minOut);

    event BoughtAndBurned(address indexed caller, address indexed tokenIn, uint256 amountIn, uint256 burned);
    event Burned(address indexed caller, uint256 amount);
    event VaultSharesRedeemed(address indexed vault, uint256 shares, uint256 assets);

    constructor(IERC20 protocolToken_, IGuardedRouter router_, ITwapOracle twap_, uint16 maxSlippageBps_) {
        if (address(protocolToken_) == address(0) || address(router_) == address(0) || address(twap_) == address(0)) {
            revert ZeroAddress();
        }
        if (maxSlippageBps_ == 0 || maxSlippageBps_ > MAX_SLIPPAGE_BPS_CEILING) revert InvalidSlippage();
        protocolToken = protocolToken_;
        router = router_;
        twap = twap_;
        maxSlippageBps = maxSlippageBps_;
    }

    /// @notice Swaps `amountIn` of `tokenIn` held by this contract for the protocol token and burns it.
    /// @param minOut Minimum protocol tokens to burn. Must be within `maxSlippageBps` of the TWAP quote.
    function execute(address tokenIn, uint256 amountIn, uint256 minOut) external nonReentrant returns (uint256 burned) {
        if (amountIn == 0) revert ZeroAmount();
        if (tokenIn == address(protocolToken)) revert CannotSwapProtocolToken();

        uint256 expected = twap.consult(tokenIn, amountIn);
        uint256 floor = (expected * (BPS - maxSlippageBps)) / BPS;
        if (minOut < floor) revert MinOutBelowTwapFloor(minOut, floor);

        uint256 deadBefore = protocolToken.balanceOf(DEAD);
        IERC20(tokenIn).forceApprove(address(router), amountIn);
        router.swap(tokenIn, address(protocolToken), amountIn, minOut, DEAD, "");
        IERC20(tokenIn).forceApprove(address(router), 0);

        burned = protocolToken.balanceOf(DEAD) - deadBefore;
        if (burned < minOut) revert InsufficientOutput(burned, minOut);
        totalBurned += burned;
        emit BoughtAndBurned(msg.sender, tokenIn, amountIn, burned);
    }

    /// @notice Burns any protocol tokens this contract already holds.
    function burnHeld() external nonReentrant returns (uint256 amount) {
        amount = protocolToken.balanceOf(address(this));
        if (amount == 0) revert ZeroAmount();
        totalBurned += amount;
        protocolToken.safeTransfer(DEAD, amount);
        emit Burned(msg.sender, amount);
    }

    /// @notice Converts vault fee shares held by this contract into the vault's asset, as far as the
    ///         vault's idle liquidity allows. The asset can then be passed to `execute`.
    /// @dev `vault` is caller-supplied. A malicious contract here can only waste the caller's gas:
    ///      this contract grants no approvals in this function and is protected against reentrancy.
    function redeemVaultShares(IERC4626 vault) external nonReentrant returns (uint256 assets) {
        uint256 shares = vault.maxRedeem(address(this));
        if (shares == 0) revert ZeroAmount();
        assets = vault.redeem(shares, address(this), address(this));
        emit VaultSharesRedeemed(address(vault), shares, assets);
    }
}
