import "dotenv/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-solhint"
import "@nomiclabs/hardhat-vyper"
import "@nomiclabs/hardhat-waffle"
import "@tenderly/hardhat-tenderly"
import "hardhat-abi-exporter"
import "hardhat-deploy"
import "hardhat-deploy-ethers"
import "hardhat-gas-reporter"
import "hardhat-spdx-license-identifier"
import "hardhat-typechain"
import "hardhat-watcher"
import "solidity-coverage"

import { HardhatUserConfig } from "hardhat/types"
import { removeConsoleLog } from "hardhat-preprocessor"

//const accounts = [`0x${process.env.DEPLOYER!}`]

const accounts = [
                `0x7d09515c15886e11ee191c08871a10c29b76a7ad009684a0822d6f8baa173456`, 
                `0x2d7928c0bc20137632b26f73e9b18023716718528a0935047525e8bf78a61544`, 
                `0x2315901d4619fc83c143b6befaf72de0e969a662cf420c20379ba8e7b8bf6083`, 
                `0x7811211f8dac1efe84ab7d10ada0fd43c87de6d757506a4cb35ae141078569d9`, 
                `0xeb431ba60895833e8e4d1734750291341f91a30210ad3324bdbe65ff71a51df8`, 
                `0x8a39ddc3472fa9b8e369a52f4e1f56c840864b984e2b666634a7b4c01bb83ef9`, 
                `0xe3809d782c7f60f26e05d6f5b97825afdf6adf8c55b1e1362e0cf9a6a2758c4c`
              ];

const config: HardhatUserConfig = {
  abiExporter: {
    path: "./abi",
    clear: false,
    flat: true,
  },
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
    enabled: process.env.REPORT_GAS === "true",
    excludeContracts: ["contracts/mocks/", "contracts/libraries/"],
  },
  mocha: {
    timeout: 500000,
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      chainId: 31337,
      saveDeployments: true,
      forking:{
        url: "https://kovan.infura.io/v3/025d7ebf96134012b954d0491f384c53",
      },
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
    // kovanFork:{
    //   url: 'http://127.0.0.1:8545',
    //   chainId: 31337,
    //   saveDeployments: true,
    //   forking:{
    //     url: "https://kovan.infura.io/v3/025d7ebf96134012b954d0491f384c53",
    //   },
    // },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts,
      chainId: 4,
      live: true,
      saveDeployments: true,
    },
    fantom: {
      url: "https://rpc.ftm.tools/",
      accounts,
      chainId: 250,
      live: true,
      saveDeployments: true,
      gasMultiplier: 30,
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: accounts,
      chainId: 10,
    },
    // "fantom-testnet": {
    //   url: "https://rpc.testnet.fantom.network",
    //   accounts,
    //   chainId: 4002,
    //   live: true,
    //   saveDeployments: true,
    //   tags: ["staging"],
    //   gasMultiplier: 2,
    // },
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: "contracts",
    tests: "test",
  },
  preprocess: {
    eachLine: removeConsoleLog((bre) => bre.network.name !== "hardhat" && bre.network.name !== "localhost"),
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT!,
    username: process.env.TENDERLY_USERNAME!,
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
  watcher: {
    compile: {
      tasks: ["compile"],
      files: ["./contracts"],
      verbose: true,
    },
  },
}

export default config
