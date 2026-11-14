// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IGuardedSwapRouter} from "./GuardedVault.sol";

interface IV3Factory { function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address); }
interface IV3Pool { function liquidity() external view returns (uint128); }
interface ISwapRouter02 {
    struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }
    function factory() external view returns (address);
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256);
}

/// Single-hop SwapRouter02 adapter. Pool routes are write-once; the vault still
/// enforces its own token permissions, oracle minimum, allocation and loss limits.
contract UniswapV3Adapter is IGuardedSwapRouter, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IV3Factory public immutable factory;
    ISwapRouter02 public immutable router;
    struct Route { address pool; uint24 fee; }
    mapping(bytes32 => Route) public routes;
    error InvalidAddress();
    error RouteAlreadySet();
    error PoolUnavailable();
    error InvalidSwap();
    error UnsupportedInput();
    error InsufficientOutput();
    event RouteSet(address indexed token0, address indexed token1, address indexed pool, uint24 fee);
    event Swapped(address indexed caller, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address owner_, IV3Factory factory_, ISwapRouter02 router_) Ownable(owner_) {
        if (address(factory_).code.length == 0 || address(router_).code.length == 0) revert InvalidAddress();
        if (router_.factory() != address(factory_)) revert InvalidAddress();
        factory = factory_; router = router_;
    }
    function routeKey(address tokenA, address tokenB) public pure returns (bytes32) {
        return tokenA < tokenB ? keccak256(abi.encode(tokenA, tokenB)) : keccak256(abi.encode(tokenB, tokenA));
    }
    function setRoute(address tokenA, address tokenB, uint24 fee) external onlyOwner {
        if (tokenA == tokenB || tokenA.code.length == 0 || tokenB.code.length == 0) revert InvalidAddress();
        bytes32 key = routeKey(tokenA, tokenB);
        if (routes[key].pool != address(0)) revert RouteAlreadySet();
        address pool = factory.getPool(tokenA, tokenB, fee);
        if (pool.code.length == 0 || IV3Pool(pool).liquidity() == 0) revert PoolUnavailable();
        routes[key] = Route(pool, fee);
        emit RouteSet(tokenA < tokenB ? tokenA : tokenB, tokenA < tokenB ? tokenB : tokenA, pool, fee);
    }
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient)
        external nonReentrant returns (uint256 amountOut)
    {
        if (recipient != msg.sender || amountIn == 0 || minAmountOut == 0 || tokenIn == tokenOut) revert InvalidSwap();
        Route memory route = routes[routeKey(tokenIn, tokenOut)];
        if (route.pool == address(0) || IV3Pool(route.pool).liquidity() == 0) revert PoolUnavailable();
        IERC20 input = IERC20(tokenIn); IERC20 output = IERC20(tokenOut);
        uint256 inputBefore = input.balanceOf(address(this));
        uint256 outputBefore = output.balanceOf(address(this));
        input.safeTransferFrom(msg.sender, address(this), amountIn);
        if (input.balanceOf(address(this)) - inputBefore != amountIn) revert UnsupportedInput();
        input.forceApprove(address(router), amountIn);
        router.exactInputSingle(ISwapRouter02.ExactInputSingleParams(tokenIn, tokenOut, route.fee, address(this), amountIn, minAmountOut, 0));
        input.forceApprove(address(router), 0);
        if (input.balanceOf(address(this)) != inputBefore) revert UnsupportedInput();
        amountOut = output.balanceOf(address(this)) - outputBefore;
        if (amountOut < minAmountOut) revert InsufficientOutput();
        output.safeTransfer(recipient, amountOut);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
