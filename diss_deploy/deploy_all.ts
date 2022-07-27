const fs = require('fs');
import { bn, duration } from "../test/utilities"
import { ethers } from 'hardhat'
import hre from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const ADMIN_ADDRESS = '0x54afe4d1D7f030a3945e08a0Ca7351d5f4029907';
const TREASURY_ADDRESS = '0x54afe4d1D7f030a3945e08a0Ca7351d5f4029907';

const poolsPerBlock = bn(6); // Masterchef mint 6 Pools per block

const timelock_time = duration.hours("6"); // Minimum: 6 hours - Maximum: XX hours


async function main() {

    // // Get Signers
    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [ADMIN_ADDRESS],
    // });
    // const deployer = await ethers.getSigner(ADMIN_ADDRESS)
    let deployer: SignerWithAddress;
    [deployer] = await ethers.getSigners();


    console.log ("\t   BeethovenxToken:");
    const PoolsToken = await ethers.getContractFactory("BeethovenxToken", deployer);
    let poolsToken = await PoolsToken.deploy();
    console.log (`\t\t BeethovenxToken Address: ${poolsToken.address}`);

    let data_json = JSON.parse(poolsToken.interface.format('json') as string)
    fs.writeFileSync('diss_abi_generated/json/BeethovenxToken_DISS.json', JSON.stringify(data_json));    
    let data_array = poolsToken.interface.format('full');
    fs.writeFileSync('diss_abi_generated/array/BeethovenxToken_DISS.txt', JSON.stringify(data_array) );



    console.log ("\t   BeethovenxMasterChef:");
    const startBlock = await hre.ethers.provider.getBlock("latest");

    const Chef = await ethers.getContractFactory("BeethovenxMasterChef", deployer);
    let chef = await Chef.deploy(
                            poolsToken.address, 
                            TREASURY_ADDRESS, 
                            poolsPerBlock, 
                            startBlock.number
                            );
    console.log (`\t\t BeethovenxMasterChef Address: ${chef.address}`);

    data_json = JSON.parse(chef.interface.format('json') as string)
    fs.writeFileSync('diss_abi_generated/json/BeethovenxMasterChef_DISS.json', JSON.stringify(data_json));    
    data_array = chef.interface.format('full');
    fs.writeFileSync('diss_abi_generated/array/BeethovenxMasterChef_DISS.txt', JSON.stringify(data_array) );


    await poolsToken.connect(deployer).transferOwnership(chef.address)
    console.log (`\t\t -> BeethovenxToken Ownership Transferred to BeethovenxMasterChef`);



    console.log ("\t   Timelock:");
    const Timelock = await ethers.getContractFactory("Timelock", deployer);
    let timelock = await Timelock.deploy(ADMIN_ADDRESS, timelock_time);
    console.log (`\t\t Timelock Address: ${timelock.address}`);

    data_json = JSON.parse(timelock.interface.format('json') as string)
    fs.writeFileSync('diss_abi_generated/json/Timelock_DISS.json', JSON.stringify(data_json));    
    data_array = timelock.interface.format('full');
    fs.writeFileSync('diss_abi_generated/array/Timelock_DISS.txt', JSON.stringify(data_array) );


    await chef.transferOwnership(timelock.address)
    console.log (`\t\t -> BeethovenxMaster Chef Ownership Transferred to Timelock`);



    console.log ("\t   MasterChefOperator:");
    const Operator = await ethers.getContractFactory("MasterChefOperator", deployer);
    let operator = await Operator.deploy(
                                    timelock.address,   // timelock address
                                    chef.address,       // MasterChef address
                                    ADMIN_ADDRESS,      // admin
                                    ADMIN_ADDRESS       // stagingAdmin
                                    );
    console.log (`\t\t MasterChefOperator Address: ${operator.address}`);

    data_json = JSON.parse(operator.interface.format('json') as string)
    fs.writeFileSync('diss_abi_generated/json/MasterChefOperator_DISS.json', JSON.stringify(data_json));    
    data_array = operator.interface.format('full');
    fs.writeFileSync('diss_abi_generated/array/MasterChefOperator_DISS.txt', JSON.stringify(data_array) );


    await timelock.connect(deployer).setPendingAdmin(operator.address)
    console.log (`\t\t -> Timelock Pending Admin Set to MasterChefOperator`);

    await operator.connect(deployer).acceptTimelockAdmin()
    console.log (`\t\t -> MasterChefOperator Accepted as Timelock Admin`);



    
    console.log ("\t   MasterChefRewarderFactory:");
    const RewarderFactory = await ethers.getContractFactory("MasterChefRewarderFactory", deployer);
    let rewarderFactory = await RewarderFactory.deploy(
                                                    operator.address,   // operator address
                                                    chef.address,       // MasterChef address
                                                    ADMIN_ADDRESS      // admin
                                                    );
    console.log (`\t\t MasterChefRewarderFactory Address: ${rewarderFactory.address}`);

    data_json = JSON.parse(rewarderFactory.interface.format('json') as string)
    fs.writeFileSync('diss_abi_generated/json/MasterChefRewarderFactory_DISS.json', JSON.stringify(data_json));    
    data_array = rewarderFactory.interface.format('full');
    fs.writeFileSync('diss_abi_generated/array/MasterChefRewarderFactory_DISS.txt', JSON.stringify(data_array) );


    // Save deployed contracts addresses
    const data_addresses = {
        "beethovenxToken": poolsToken.address,
        "beethovenxMasterChef": chef.address,
        "timelock": timelock.address,
        "masterChefOperator": operator.address,
        "masterChefRewarderFactory": rewarderFactory.address,
    };
    fs.writeFileSync('diss_deployed_addresses/deployed_addresses_DISS.json', JSON.stringify(data_addresses));

    console.log("\t DONE");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });