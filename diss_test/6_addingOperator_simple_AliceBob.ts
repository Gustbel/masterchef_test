const fs = require('fs');
//import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { advanceTime, advanceBlock, advanceBlockTo, bn, deployChef, duration, deployContract, deployERC20Mock, setAutomineBlocks, latest } from "../test/utilities"
import { ethers } from "hardhat"
import moment from "moment"
import { BeethovenxMasterChef, BeethovenxToken, RewarderMock } from "../types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import hre from "hardhat"
import { connect } from "http2";

let kovan_addr = [
            "0x54afe4d1D7f030a3945e08a0Ca7351d5f4029907",
            "0x1310C274A2d322829e4D04aE91B18b14E1EfDb98",
            "0xd524DAB398C960b8bb3Cdb08874F403DEC771EA4",
            "0x4f1396ACaF39721D22E1C2Ce168c5c6d047cC5b9",
            "0x01363591A815D957c164D0100547A088f6b7d105",
            "0x6e3CECB4Cd9798C1a02e114C2F2B72c08F0DEf9f"
]


async function main() {

    console.log ("    -- DISS Masterchef TEST --");

    let owner: SignerWithAddress
    let dev: SignerWithAddress
    let treasury: SignerWithAddress
    let alice: SignerWithAddress
    let bob: SignerWithAddress
    let carol: SignerWithAddress

    //Get Signers
    for (var i = 0; i < kovan_addr.length; i++)
    {
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [kovan_addr[i]],
        });
    }
    owner = await ethers.getSigner(kovan_addr[0]);
    dev = await ethers.getSigner(kovan_addr[1]);
    treasury = await ethers.getSigner(kovan_addr[2]);
    alice = await ethers.getSigner(kovan_addr[3]);
    bob = await ethers.getSigner(kovan_addr[4]);
    carol = await ethers.getSigner(kovan_addr[5]);

    const treasuryPercentage = 128
    const lpPercentage = 872

    console.log ('DEPLOYER/owner:', owner.address);
    console.log ('DEVELOPER:', dev.address);
    console.log ('TREASURY:', treasury.address);
    console.log ('ALICE:', alice.address);
    console.log ('BOB:', bob.address);
    console.log ('CAROL:', carol.address);


    // Deploy Contract Token
    console.log ("\n - Deploying BeethovenxToken contract...");
    const Pools = await ethers.getContractFactory("BeethovenxToken", owner);
    let pools = await Pools.deploy();
    console.log ("\t BeethovenxToken contract deployed at:", pools.address);
    const actualPoolsOwnerAddress_old = await pools.owner()
    console.log ("\t BeethovenxToken contract owner:", actualPoolsOwnerAddress_old);

    
    // Mint tokens to dev
    console.log ("\n - Minting tokens to dev...");
    const amountToMint = bn(0)      // Init in 0 for better reward calculation
    let tx = await pools.mint(dev.address, amountToMint)
    console.log ("\t Dev has", amountToMint.toString() , "tokens");

    // Deploy Contract MasterChef

    const poolsPerBlock = bn(6)

    const startBlock = tx.blockNumber;
    console.log ("ActualBlock:", tx.blockNumber);
    console.log ("\n - Deploying MasterChef contract in block "+ startBlock + " with 6 POOLS reward per Block...");

    const Chef = await ethers.getContractFactory("BeethovenxMasterChef", owner);
    let chef = await Chef.deploy(pools.address, treasury.address, poolsPerBlock, startBlock);
    console.log ("\t MasterChef contract deployed at:", chef.address);
    await pools.transferOwnership(chef.address)
    console.log ("\n - BeethovenxToken contract ownership transferred to MasterChef contract");


    const Timelock = await ethers.getContractFactory("Timelock", owner);
    let timelock = await Timelock.deploy(owner.address, duration.hours("8"));
    console.log ("\t Timelock contract deployed at:", timelock.address);
    await chef.transferOwnership(timelock.address)


    const Operator = await ethers.getContractFactory("MasterChefOperator", owner);
    let operator = await Operator.deploy(timelock.address, chef.address, owner.address, owner.address);
    console.log ("\t MasterChefOperator contract deployed at:", operator.address);
    await timelock.connect(owner).setPendingAdmin(operator.address)
    await operator.connect(owner).acceptTimelockAdmin()

    // Fetch MC contract properties
    const actualPoolsAddress = await chef.beets()
    const actualTreasuryAddress = await chef.treasuryAddress()
    const actualPoolsOwnerAddress = await pools.owner()
    const actualTreasuryPercentage = await chef.TREASURY_PERCENTAGE()
    const actualPoolsPerBlock = await chef.beetsPerBlock()

    console.log("\n - Masterchef contract properties:")
    console.log("\t\t - Actual BeethovenxToken contract address:", actualPoolsAddress);
    console.log("\t\t - Actual Treasury contract address:", actualTreasuryAddress);
    console.log("\t\t - Actual BeethovenxToken contract owner address:", actualPoolsOwnerAddress);
    console.log("\t\t - Actual Treasury percentage:", actualTreasuryPercentage.toString());
    console.log("\t\t - Actual BeethovenxToken contract per block:", actualPoolsPerBlock.toString());

    // Create LP ERC20s
    console.log ("\n - Deploying 2 ERC20s (LPs)...");

    const Lp1Token = await ethers.getContractFactory('ERC20Mock', owner);
    const lp1Token = await Lp1Token.deploy("Lp1Token", "LP1", 0, 100);
 
    const Lp2Token = await ethers.getContractFactory('ERC20Mock', owner);
    const lp2Token = await Lp2Token.deploy("Lp2Token", "LP2", 0, 100);

    console.log (`\t LP Token 1 deployed at: ${lp1Token.address}\n\t    and LP Token 2 deployed at: ${lp2Token.address}`);
    let balance_owner = await lp1Token.balanceOf(owner.address)
    console.log ("\t Owner has " + balance_owner.toString() + " LPs");


    let totalSupply = await pools.totalSupply()
    console.log (`\t\t Total POOLS ERC20 Tokens supply: ${totalSupply/1e18}`);


    // Operator Operator Add Pools with allocation points
    console.log(`\t\t Operator Add Pools with allocation points:`);
    const etaFirst = await createEta()
    await operator.connect(owner).stageFarmAdditions(
      [
        { lpToken: lp1Token.address, allocationPoints: 10, rewarder: ethers.constants.AddressZero },
        { lpToken: lp2Token.address, allocationPoints: 10, rewarder: ethers.constants.AddressZero },
      ],
      etaFirst
    )

    const farmAddTx0 = await operator.connect(owner).farmAdditions(etaFirst, 0)
    const farmAddTx1 = await operator.connect(owner).farmAdditions(etaFirst, 1)

    // lets queue it up
    await operator.connect(owner).commitFarmChanges(etaFirst, 0)
    await advanceTime(duration.hours("11").toNumber())
    // and execute it
    await operator.connect(owner).commitFarmChanges(etaFirst, 1)
    await advanceTime(duration.hours("11").toNumber())



    let poolLengt = await chef.poolLength()
    console.log ("\t - Masterchef Pool quantity length:", poolLengt.toString())


    totalSupply = await pools.totalSupply()
    console.log (`\t\t Total POOLS ERC20 Tokens supply: ${totalSupply/1e18}`);

    // Alice make a deposit
    console.log ("\n - Alice makes a deposit...");

    console.log ("\t - Sending 10 LP1 to Alice and 10 LP2 to Bob...");
    await lp1Token.connect(owner).transfer(alice.address, 10)
    await lp2Token.connect(owner).transfer(bob.address, 20)

    console.log (`\t - Alice Deposit 10 tokens in Masterchef at ` + tx.blockNumber + ` Block ...`);
    await lp1Token.connect(alice).approve(chef.address, 10)
    let depositionPoint = await chef.connect(alice).deposit(0, 10, alice.address)

    totalSupply = await pools.totalSupply()
    console.log (`\t\t Total POOLS ERC20 Tokens supply: ${totalSupply/1e18}`);

    // Bob make a deposit
    console.log (`\t - Bob Deposit 10 tokens in Masterchef at ` + tx.blockNumber + ` Block ...`);
    await lp2Token.connect(bob).approve(chef.address, 20)
    depositionPoint = await chef.connect(bob).deposit(1, 20, bob.address)

    console.log("\t - Waiting 10 blocks..........\n\t\tWe will see the rewards...");
    await advanceBlockTo(depositionPoint.blockNumber! + 10)
    tx = await chef.connect(owner).updatePool(0)
    let alicePendingPools = await chef.pendingBeets(0, alice.address)
    let bobPendingPools = await chef.pendingBeets(1, bob.address)
    console.log (`\t\t In Block ` + tx.blockNumber + `. Alice has ${alicePendingPools/1e18} pending pools and Bob has ${bobPendingPools/1e18} pending pools`);


    console.log("\t - Now we wait 1 blocks more..........");
    tx = await chef.connect(owner).updatePool(0)
    let alicePendingPools_1block = await chef.pendingBeets(0, alice.address)
    let bobPendingPools_1block = await chef.pendingBeets(1, bob.address)
    console.log (`\t\t In Block ` + tx.blockNumber + `. Alice has ${alicePendingPools_1block/1e18} pending pools and Bob has ${bobPendingPools_1block/1e18} pending pools`);

    console.log("\n\t ALICE GENERATE A REWARD OF: " + (alicePendingPools_1block/1e18 - alicePendingPools/1e18) + " POOLS per block");
    console.log("\t and BOB GENERATE A REWARD OF: " + (bobPendingPools_1block/1e18 - bobPendingPools/1e18) + " POOLS per block\n");


    // Modify the pools allocations
    console.log ("\n - Now we modify the pools allocations. Pool1 change from 10 to 40. Pool2 change from 10 to 20");
    const firstEtaModification = await createEta()
    await operator.connect(owner).stageFarmModifications(
        [
          {
            allocationPoints: 40,
            pid: 0,
            rewarder: ethers.constants.AddressZero,
            overwriteRewarder: true,
          },
        ],
        firstEtaModification
      )
    
    const secondEtaModification = await createEta()
    await operator.connect(owner).stageFarmModifications(
        [
        {
            allocationPoints: 20,
            pid: 1,
            rewarder: ethers.constants.AddressZero,
            overwriteRewarder: true,
        },
        ],
        secondEtaModification
    )

    await operator.connect(owner).commitFarmChanges(firstEtaModification, 0)
    await operator.connect(owner).commitFarmChanges(secondEtaModification, 0)
    await operator.queuedFarmChangeEtas()
    await advanceTime(duration.hours("11").toNumber())

    await operator.connect(owner).commitFarmChanges(firstEtaModification, 1)
    await operator.connect(owner).commitFarmChanges(secondEtaModification, 1)
    await operator.queuedFarmChangeEtas()
    await advanceTime(duration.hours("11").toNumber())


    console.log("Listo Perro\n\n")


    console.log("\t - Waiting 10 blocks..........\n\t\tWe will see the rewards...");
    await advanceBlockTo(depositionPoint.blockNumber! + 10)
    tx = await chef.connect(owner).updatePool(0)
    alicePendingPools = await chef.pendingBeets(0, alice.address)
    bobPendingPools = await chef.pendingBeets(1, bob.address)
    console.log (`\t\t In Block ` + tx.blockNumber + `. Alice has ${alicePendingPools/1e18} pending pools and Bob has ${bobPendingPools/1e18} pending pools`);


    console.log("\t - Now we wait 1 blocks more..........");
    tx = await chef.connect(owner).updatePool(0)
    alicePendingPools_1block = await chef.pendingBeets(0, alice.address)
    bobPendingPools_1block = await chef.pendingBeets(1, bob.address)
    console.log (`\t\t In Block ` + tx.blockNumber + `. Alice has ${alicePendingPools_1block/1e18} pending pools and Bob has ${bobPendingPools_1block/1e18} pending pools`);

    console.log("\n\t ALICE GENERATE A REWARD OF: " + (alicePendingPools_1block/1e18 - alicePendingPools/1e18) + " POOLS per block");
    console.log("\t and BOB GENERATE A REWARD OF: " + (bobPendingPools_1block/1e18 - bobPendingPools/1e18) + " POOLS per block\n");




    console.log("\t - Alice and Bob make a Harvest of the rewards...");
    let alice_pools_balance = await pools.balanceOf(alice.address)
    console.log (`\t\t POOLS Tokens balance in ALICE wallet (before the harvest): ${alice_pools_balance/1e18}`);
    let bob_pools_balance = await pools.balanceOf(bob.address)
    console.log (`\t\t POOLS Tokens balance in BOB wallet (before the harvest): ${bob_pools_balance/1e18}`);

    
    console.log("\t\t - Harvesting...");
    await chef.connect(owner).updatePool(0)
    await chef.connect(alice).harvest(0, alice.address)
    await chef.connect(bob).harvest(1, bob.address)


    alice_pools_balance = await pools.balanceOf(alice.address)
    console.log (`\t\t POOLS Tokens balance in ALICE wallet (AFTER the harvest): ${alice_pools_balance/1e18}`);
    bob_pools_balance = await pools.balanceOf(bob.address)
    console.log (`\t\t POOLS Tokens balance in BOB wallet (AFTER the harvest): ${bob_pools_balance/1e18}`);





    

    totalSupply = await pools.totalSupply()
    //let totalSupplyfPOOLS = await fPOOLSToken.totalSupply()
    console.log (`\t\t Total POOLS ERC20 Tokens supply: ${totalSupply/1e18}`);
    //console.log (`\t\t Total TOKEN ERC20 Tokens supply: ${totalSupplyfPOOLS/1e18}`);

    console.log("\nDONE");
}

async function createEta(hours: number = 10) {
    return moment
      .unix((await latest()).toNumber())
      .add(hours, "hours")
      .unix()
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
