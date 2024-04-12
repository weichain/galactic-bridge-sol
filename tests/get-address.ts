import { ethers } from "ethers";

describe("Get Address", () => {
  // 04d0b2fc6a0674a6f45daf899a6dd0ac4181f2df03779a2a5b2c94ac2a76d93a6d0c13a37186bf4f70999cd4bd59345576931329271ee9b601e7c850d79dd01261
  const address =
    "0x" +
    "04d0b2fc6a0674a6f45daf899a6dd0ac4181f2df03779a2a5b2c94ac2a76d93a6d0c13a37186bf4f70999cd4bd59345576931329271ee9b601e7c850d79dd01261".slice(
      2
    );

  console.log("Formatted address string:");
  console.log(address);
  console.log("Formatted address bytes:");
  console.log(ethers.toBeArray(address));
});
