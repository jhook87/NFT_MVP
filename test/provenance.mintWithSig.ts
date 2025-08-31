import { ethers } from "hardhat";
import { expect } from "chai";

describe("Provenance721", () => {
  it("mints with EIP-712 and prevents duplicates", async () => {
    const [owner, author, to] = await ethers.getSigners();
    const C = await ethers.getContractFactory("Provenance721");
    const c = await C.deploy();
    await c.deployed();

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = { name: "Provenance721", version: "1", chainId, verifyingContract: c.address };
    const types = {
      MintRequest: [
        { name: "contentHash", type: "bytes32" },
        { name: "metadataURI", type: "string" },
        { name: "to", type: "address" },
        { name: "author", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const req = {
      contentHash: "0x" + "11".repeat(32),
      metadataURI: "https://example.com/meta.json",
      to: to.address,
      author: author.address,
      nonce: 0,
      deadline: Math.floor(Date.now() / 1000) + 3600,
    };
    const sig = await author._signTypedData(domain, types, req);
    await expect(c.mintWithSig(req, sig)).to.emit(c, "Minted");
    // Duplicate should revert
    await expect(c.mintWithSig(req, sig)).to.be.reverted;
  });
});