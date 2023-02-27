const fs = require('fs');
const {utils, BigNumber} = require('ethers');
const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");

const abi = [
  {
      "constant": true,
      "inputs": [
      {
          "name": "_owner",
          "type": "address"
      }
      ],
      "name": "balanceOf",
      "outputs": [
      {
          "name": "balance",
          "type": "uint256"
      }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
    "constant": false,
    "inputs": [
        {
            "name": "_spender",
            "type": "address"
        },
        {
            "name": "_value",
            "type": "uint256"
        }
    ],
    "name": "approve",
    "outputs": [
        {
            "name": "",
            "type": "bool"
        }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
        {
            "indexed": true,
            "name": "from",
            "type": "address"
        },
        {
            "indexed": true,
            "name": "to",
            "type": "address"
        },
        {
            "indexed": false,
            "name": "value",
            "type": "uint256"
        }
    ],
    "name": "Transfer",
    "type": "event"
  }
  ];
 const erc20multiSendAbi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddr",
          "type": "address"
        },
        {
          "internalType": "uint256[]",
          "name": "amounts",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "destinations",
          "type": "address[]"
        },
        {
          "internalType": "uint256",
          "name": "total",
          "type": "uint256"
        }
      ],
      "name": "send",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]

const nextepAddressBSC = '0xF10770649b0b8f62BB5E87ad0da7729888A7F5C3';
const web3 = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed1.binance.org"));
const contract = new web3.eth.Contract(abi, nextepAddressBSC);

async function fetchTokenBalance(address) {
    const result = await contract.methods.balanceOf(address).call();
    return BigNumber.from(result)
}

const ignoreAddresses = [
  "0x81e0ef68e103ee65002d3cf766240ed1c070334d", //KIPS
  "0x3a074a38f814c647356dc1cdd59c862c8ade8bbb", //Pancake
  "0x4459fd70af1b4ff53f64df391f01f29d75724fb0", //contract
  "0xF10770649b0b8f62BB5E87ad0da7729888A7F5C3", //contract
  "0x4f9d25cab600f14ff8dc87692e00731ec9ddc414", //contract
  "0x000000000000000000000000000000000000dead", //burn
  "0x577fb71bc24766129a502bdd9f6dbdbffba7adc2", //contract
  "0x42247c6836a03197c12ec67b2a04f250fb12020d", //contract
  "0x1111111254eeb25477b68fb85ed929f73a960582" //only has 1 unit
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function distribute(accounts, amounts, total) {
  console.log(accounts.length, amounts.length, total)
  let provider = new HDWalletProvider("74045f9ba6b8b4de3f6901afd99357bc71f2e3ef7eae7b5000caef00e601b113","https://cxs-rpc-2.nxchainscan.com/");
  const web32 = new Web3(provider);
  const multiSendAddr = "0x849c24DcFF665188062E0ed34a82c1A9e57ed58B";
  const contract = new web32.eth.Contract(erc20multiSendAbi, multiSendAddr, provider);
  const nextep = new web32.eth.Contract(abi, "0x0000000000000000000000000000000000001112", provider);
  console.log("approving")
  await nextep.methods.approve(multiSendAddr, total).send({from: provider.getAddress(0)});
  console.log("sending")
  const res = await contract.methods.send("0x0000000000000000000000000000000000001112", amounts, accounts, total).send({from: provider.getAddress(0)});
  console.log(res)
  provider.engine.stop();
}

async function main() {

//   const nReadlines = require('n-readlines');
//   const addresses = new nReadlines('./scripts/holderslist.txt');
//   let line;
//   let lineNumber = 1;


//   let results = {

//   }

//   const promiseAll = async (obj) => {
//     if (obj && typeof obj.then == 'function') obj = await obj;
//     if (!obj || typeof obj != 'object') return obj;
//     const forWaiting = [];
//     Object.keys(obj).forEach(k => {
//         if (obj[k] && typeof obj[k].then == 'function') forWaiting.push(obj[k].then(res => obj[k] = res));
//         if (obj[k] && typeof obj[k] == 'object') forWaiting.push(promiseAll(obj[k]))
//     });
//     await Promise.all(forWaiting);
//     return obj;
// }

//   while (line = addresses.next()) {
//       let address = line.toString("utf-8").substring(0, 42);
//       if(!ignoreAddresses.includes(address)) {
//         results[address] = fetchTokenBalance(address);
//       } else console.log("ignoring address ", address)
//   }

//   await promiseAll(results)

  const results = require('../nextep.json');

  let finalResults = {

  }

  let holders = 0;

  Object.keys(results).forEach(key => {
    const amount = results[key];
    const value = BigNumber.from(amount).toString();
    console.log(value)
    if(value != "0") {
      finalResults[key] = value;
      holders++;
    }
  })
  console.log(holders)
  let amounts = []
  let destinations = []

  let total = BigNumber.from(0);
  Object.keys(finalResults).forEach(key => {
    destinations.push(key)
    amounts.push(finalResults[key])
    total = total.add(BigNumber.from(finalResults[key]))
  });

  console.log(amounts.length, destinations.length)

  const totalStr = total.toString();

  //split into segments of 100

  let temp_destinations = []
  let temp_amounts = []
  let counter = 0;
  let amount = BigNumber.from(0);

  for(let i = 0; i < destinations.length; i++) {
    temp_amounts.push(amounts[i]);
    temp_destinations.push(destinations[i]);
    amount = amount.add(BigNumber.from(amounts[i]));
    if(counter == 99) {
      await distribute(temp_destinations, temp_amounts, amount.toString());
      temp_destinations = []
      temp_amounts = []
      counter = 0;
      amount = BigNumber.from(0);
    } else counter++;
  }

  //await distribute(temp_destinations, temp_amounts, amount.toString());

  //fs.writeFileSync("nextep2.json", JSON.stringify({amounts, destinations, totalStr}), 'utf-8');

}

main();