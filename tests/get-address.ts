import { ethers } from 'ethers';

describe("Get Address", () => {
  const address = 
    '0x' + '04ccf59acab5758755cd1e06c5143d3727904b268579b24f948fabd6753d3ee143cdf4b76334aeb51b758cba5755253f48a341294f11c14fe018046243774f3f30'
              .slice(2)

  console.log('Formatted address string:')
  console.log(address)
  console.log('Formatted address bytes:')
  console.log(ethers.toBeArray(address))
})