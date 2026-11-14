// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IQuoterV2 {
    struct QuoteExactInputSingleParams { address tokenIn; address tokenOut; uint256 amountIn; uint24 fee; uint160 sqrtPriceLimitX96; }
    function quoteExactInputSingle(QuoteExactInputSingleParams memory p) external returns (uint256 amountOut, uint160, uint32, uint256);
}
interface IRouter02 {
    struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }
    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256);
    function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory);
}
interface IAggregator { function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80); }
interface IFactory { function isVault(address) external view returns (bool); }

/// Funds a SIRO vault from the deployer: ETH -> USDG on Uniswap v3 SwapRouter02, then ERC-4626
/// deposit with shares to the deployer. Reusable per tranche; every amount comes from env.
///
/// Guarantees (enforced on chain, not only in simulation):
///  - the swap carries amountOutMinimum = quote * (1 - FUND_SLIPPAGE_BPS), so a fill worse than
///    that reverts the swap and nothing is deposited;
///  - the multicall deadline is block.timestamp + 60s at signing time;
///  - the deposit amount is exactly that minimum, so it can never exceed what the swap delivered.
/// Refuses to run if the deployer would fall under FUND_ETH_RESERVE, if the best tier deviates
/// more than 1% from Chainlink ETH/USD, or if the deposit falls outside [FUND_MIN_USDG, FUND_MAX_USDG].
/// The 1% tier is excluded by policy (docs/swap-brief.md).
contract FundVault is Script {
    address constant QUOTER = 0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7;
    address constant ROUTER = 0xCaf681a66D020601342297493863E78C959E5cb2;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant ETH_USD = 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9;
    address constant FACTORY = 0x33f420792328958739e4983A9Bac7FB44297Cf91;

    struct Plan { address deployer; address vault; uint256 amountIn; uint24 fee; uint256 quote; uint256 refOut; uint256 minOut; }

    function run() external {
        require(block.chainid == 4663, "Unsupported chain");
        require(vm.envOr("ALLOW_MAINNET_DEPLOY", false), "Mainnet requires explicit opt-in");
        uint256 key = vm.envUint("PRIVATE_KEY");
        Plan memory p = _plan(vm.addr(key));
        _log(p);

        uint256 usdgBefore = IERC20(USDG).balanceOf(p.deployer);
        uint256 sharesBefore = IERC4626(p.vault).balanceOf(p.deployer);
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeCall(IRouter02.exactInputSingle, (IRouter02.ExactInputSingleParams(WETH, USDG, p.fee, p.deployer, p.amountIn, p.minOut, 0)));

        vm.startBroadcast(key);
        IRouter02(ROUTER).multicall{value: p.amountIn}(block.timestamp + 60, calls);
        uint256 received = IERC20(USDG).balanceOf(p.deployer) - usdgBefore;
        require(received >= p.minOut, "Fill below minOut");
        require((p.quote - (received < p.quote ? received : p.quote)) * 10_000 <= p.quote * 100, "Fill deviates > 1% from quote");
        IERC20(USDG).approve(p.vault, p.minOut);
        IERC4626(p.vault).deposit(p.minOut, p.deployer);
        vm.stopBroadcast();

        console.log("simulated USDG received (6dp)", received);
        console.log("shares received", IERC4626(p.vault).balanceOf(p.deployer) - sharesBefore);
    }

    /// Pre-flight, all read-only: nothing here is broadcast.
    function _plan(address deployer) internal returns (Plan memory p) {
        p.deployer = deployer;
        p.vault = vm.envAddress("FUND_VAULT");
        p.amountIn = vm.envUint("FUND_ETH_WEI");
        uint256 slippageBps = vm.envOr("FUND_SLIPPAGE_BPS", uint256(50));
        require(slippageBps > 0 && slippageBps <= 100, "Slippage must be within 1%");
        require(IFactory(FACTORY).isVault(p.vault), "Not a factory vault");
        require(IERC4626(p.vault).asset() == USDG, "Vault asset is not USDG");
        require(deployer.balance >= p.amountIn + vm.envOr("FUND_ETH_RESERVE_WEI", uint256(0.01 ether)), "ETH reserve would be breached");
        uint24[3] memory tiers = [uint24(100), uint24(500), uint24(3000)];
        for (uint256 i; i < tiers.length; ++i) {
            (uint256 out,,,) = IQuoterV2(QUOTER).quoteExactInputSingle(IQuoterV2.QuoteExactInputSingleParams(WETH, USDG, p.amountIn, tiers[i], 0));
            console.log("quote tier", tiers[i], out);
            if (out > p.quote) { p.quote = out; p.fee = tiers[i]; }
        }
        (, int256 answer,, uint256 updatedAt,) = IAggregator(ETH_USD).latestRoundData();
        require(answer > 0 && block.timestamp - updatedAt <= 1 days, "Chainlink ETH/USD stale");
        p.refOut = p.amountIn * uint256(answer) / 1e20; // 18-dec ETH * 8-dec USD -> 6-dec USDG
        uint256 gap = p.quote > p.refOut ? p.quote - p.refOut : p.refOut - p.quote;
        require(gap * 10_000 <= p.refOut * 100, "Best tier deviates > 1% from Chainlink");
        p.minOut = p.quote * (10_000 - slippageBps) / 10_000;
        require(p.minOut >= vm.envOr("FUND_MIN_USDG", uint256(25e6)) && p.minOut <= vm.envOr("FUND_MAX_USDG", uint256(50e6)), "Deposit outside the configured USDG range");
    }

    function _log(Plan memory p) internal view {
        console.log("deployer", p.deployer);
        console.log("vault", p.vault);
        console.log("ETH in (wei)", p.amountIn);
        console.log("best tier", p.fee);
        console.log("quote USDG (6dp)", p.quote);
        console.log("Chainlink reference USDG (6dp)", p.refOut);
        console.log("minOut = deposit USDG (6dp)", p.minOut);
        console.log("expected shares", IERC4626(p.vault).previewDeposit(p.minOut));
        console.log("deployer ETH before (wei)", p.deployer.balance);
    }
}
