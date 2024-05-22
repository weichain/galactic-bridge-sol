import { ethers } from "ethers";

describe("Get Address", () => {
  // 04449d7bbca9446df12f0f929c088edfec7223c339f5d98cb5b4055572a36c94f0888809b30f7a499fcc0c2292c682fb3d7adc7656ef0d6d3f689a15ebee9c23cc
  const address =
    "0x" +
    "0450871d924d2c8f80a3fc518fa63fe2248d03e40d944ffe3fcd6ccf778f90ef71844d1adf401be7a6ac8ab05f22fa20c6a6d114484f46d98345e435f740a16271".slice(
      2
    );

  console.log("Formatted address string:");
  console.log(address);
  console.log("Formatted address bytes:");
  console.log(ethers.toBeArray(address));
});
