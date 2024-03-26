import { ethers } from "ethers";

describe("Get Address", () => {
  const address =
    "0x" +
    "04de48381e1b54e2463cafdcafc3aaf7d99b1c512a16ac60e6415514d07ab78d6010b31fc919cc196b82ede54859f1d9cd69258f83b5d5bb146a77f326b9a723ab".slice(
      2
    );

  console.log("Formatted address string:");
  console.log(address);
  console.log("Formatted address bytes:");
  console.log(ethers.toBeArray(address));
});
