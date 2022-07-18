const fs = require('fs');
//import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { advanceBlock, advanceBlockTo, bn, deployChef, deployContract, deployERC20Mock, setAutomineBlocks } from "../test/utilities"
import { ethers } from "hardhat"
import { BeethovenxMasterChef, BeethovenxToken, RewarderMock } from "../types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber } from "ethers"
import hre from "hardhat"

let kovan_addr = [
            "0x54afe4d1D7f030a3945e08a0Ca7351d5f4029907",
            "0x1310C274A2d322829e4D04aE91B18b14E1EfDb98",
            "0xd524DAB398C960b8bb3Cdb08874F403DEC771EA4",
            "0x4f1396ACaF39721D22E1C2Ce168c5c6d047cC5b9",
            "0x01363591A815D957c164D0100547A088f6b7d105",
            "0x6e3CECB4Cd9798C1a02e114C2F2B72c08F0DEf9f"
]


async function main() {

    console.log ("    -- Masterchef TEST --");

    let beets: BeethovenxToken
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
    beets = await deployContract("BeethovenxToken", [])
    console.log ("\t BeethovenxToken contract deployed at:", beets.address);

    // Mint tokens to dev
    console.log ("\n - Minting tokens to dev...");
    const amountToMint = bn(1000)
    await beets.mint(dev.address, amountToMint)
    console.log ("\t Dev has", amountToMint.toString() , "tokens");

    // Deploy Contract MasterChef
    console.log ("\n - Deploying MasterChef contract...");
    const startBlock = 521

    const beetsPerBlock = bn(6)

    const chef = await deployChef(beets.address, treasury.address, beetsPerBlock, startBlock)
    console.log ("\t MasterChef contract deployed at:", chef.address);
    await beets.transferOwnership(chef.address)
    console.log ("\n - BeethovenxToken contract ownership transferred to MasterChef contract");

    // Fetch MC contract properties
    const actualBeetsAddress = await chef.beets()
    const actualTreasuryAddress = await chef.treasuryAddress()
    const actualBeetsOwnerAddress = await beets.owner()
    const actualTreasuryPercentage = await chef.TREASURY_PERCENTAGE()
    const actualBeetsPerBlock = await chef.beetsPerBlock()

    console.log("\n - Masterchef contract properties:")
    console.log("\t\t - Actual BeethovenxToken contract address:", actualBeetsAddress);
    console.log("\t\t - Actual Treasury contract address:", actualTreasuryAddress);
    console.log("\t\t - Actual BeethovenxToken contract owner address:", actualBeetsOwnerAddress);
    console.log("\t\t - Actual Treasury percentage:", actualTreasuryPercentage.toString());
    console.log("\t\t - Actual BeethovenxToken contract per block:", actualBeetsPerBlock.toString());





    console.log("\nDONE");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });