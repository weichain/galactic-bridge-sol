import { ethers } from "ethers";

describe("Get Address", () => {
  // 04c1ab9735077d400d7e992087ed3e09721ecd25d2238f5b6d0ec5f899aff090db0f3c5b976ca2305440f31367e3b5c51cb58413de5962714ea41015812ed5069f
  const address =
    "0x" +
    "04c1ab9735077d400d7e992087ed3e09721ecd25d2238f5b6d0ec5f899aff090db0f3c5b976ca2305440f31367e3b5c51cb58413de5962714ea41015812ed5069f".slice(
      2
    );

  console.log("Formatted address string:");
  console.log(address);
  console.log("Formatted address bytes:");
  console.log(ethers.toBeArray(address));
});
