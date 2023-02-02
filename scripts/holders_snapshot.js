const fs = require('fs');
const {utils, BigNumber} = require('ethers');
const Web3 = require('web3');

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


const contractAddress = '0xdc4074390714b5008e01439302f0fed4661ba4c8'; // address of the token contract
const web3 = new Web3(new Web3.providers.HttpProvider("https://compatible-multi-scion.bsc.discover.quiknode.pro/192637f76e77fdb0de21b97f0ae2121c95176ad3"));
// const contract = new web3.eth.Contract(abi, contractAddress);

// async function fetchTokenBalance(address) {
//     const result = await contract.methods.balanceOf(address).call();
//     return utils.formatEther(result);
// }

async function fetchJSONData(fromBlock, toBlock) {
  try {
    const response = await fetch(`https://api.bscscan.com/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=0xdc4074390714b5008e01439302f0fed4661ba4c8&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`);
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error(`Error occurred while fetching data from ${url}: ${error}`);
  }
}

const distributorAddresses = [
  '0x7735562229A3d765D468E8B424C3bb0fEdb068E7',
  '0x4c220F6d617237f5f4C950707319Aa2e3CF79f10',
  '0x4d96C14E25600a746dDF776a866f48b5BcC3cBB7',
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

  const fromBlock = 21848343;
  const toBlock = 25304046;

  const firstBatch = await fetchJSONData(0, 22290161);
  console.log(firstBatch.length)

  await sleep(5000);

  const secondBatch = await fetchJSONData(22290162, 23290161);
  console.log(secondBatch.length)

  await sleep(5000);

  const thirdBatch = await fetchJSONData(23290162, 25304046);
  console.log(thirdBatch.length)

  const result = firstBatch.concat(secondBatch).concat(thirdBatch);

  console.log(result.length)

  
  
  const transfers = result.map(transfer => {
    return {
      from: web3.eth.abi.decodeParameter("address", transfer.topics[1]),
      to: web3.eth.abi.decodeParameter("address", transfer.topics[2]),
      value: web3.eth.abi.decodeParameter("uint256", transfer.data),
      time: parseInt(transfer.timeStamp,16)
    }
  })

  let balances = new Map();
  let transfersCount = 0;
  transfers.forEach(transfer => {
    transfersCount++;
    balances.set(transfer.from, BigNumber.from(0));
    balances.set(transfer.to, BigNumber.from(0));
  })
  // add original mint
  balances.set("0x4d96C14E25600a746dDF776a866f48b5BcC3cBB7", utils.parseEther("100000000000"))

  transfers.forEach(transfer => {
    balances.set(transfer.from, balances.get(transfer.from).sub(transfer.value))
    balances.set(transfer.to, balances.get(transfer.to).add(transfer.value))
  })
  let holders = 0;
  let total = BigNumber.from(0);
  let jsonResult = {}
  balances.forEach((value, key) => {
    if(value.toString() != "0" && !distributorAddresses.includes(key)) {
      jsonResult[key] = {balance: value.toHexString()}
      holders++;
      total = total.add(value)
    }
  })

  console.log("holders", holders, total.toString(), BigNumber.from("1000000000000000000000000000").sub(total).toHexString())
  fs.writeFileSync("balances.json", JSON.stringify(jsonResult), 'utf-8');
}

main();