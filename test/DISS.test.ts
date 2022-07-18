import { deployContract, bn } from "./utilities"
import { BeethovenxToken } from "../types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers } from "hardhat"


describe("BeethovenX token tests", () => {
  let beets: BeethovenxToken
  let owner: SignerWithAddress
  let dev: SignerWithAddress
  let treasury: SignerWithAddress

  beforeEach(async function () {
    beets = await deployContract("BeethovenxToken", [])
    const signers = await ethers.getSigners()
    owner = signers[0]
    dev = signers[1]
    treasury = signers[2]

    const amountToMint = bn(1000)
    await beets.mint(dev.address, amountToMint)
  })

})
