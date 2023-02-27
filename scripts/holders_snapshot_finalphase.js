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
const web3 = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed1.binance.org"));
const contract = new web3.eth.Contract(abi, contractAddress);

async function fetchTokenBalance(address) {
    const result = await contract.methods.balanceOf(address).call();
    return BigNumber.from(result)
}

async function fetchJSONData(fromBlock, toBlock) {
  try {
    const response = await fetch(`https://api.bscscan.com/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${contractAddress}&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`);
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error(`Error occurred while fetching data from ${url}: ${error}`);
  }
}

const distributorAddresses = [
  '0x4c220F6d617237f5f4C950707319Aa2e3CF79f10',
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

  const fromBlock = 23260490; //beginning 22 nov
  const toBlock = 25502596; //end 8 feb

  const firstBatch = await fetchJSONData(fromBlock, "latest");

  let buys = []

  let buysTotal = BigNumber.from("0");

  firstBatch.map(transfer => {
    const from = web3.eth.abi.decodeParameter("address", transfer.topics[1]);
    const to = web3.eth.abi.decodeParameter("address", transfer.topics[2]);
    let amount = web3.eth.abi.decodeParameter("uint256", transfer.data);
    const timestamp = parseInt(transfer.timeStamp,16);
    const blockNumber = parseInt(transfer.blockNumber,16);
    if(blockNumber <= toBlock && distributorAddresses.includes(from)) {
      if(!buys[to])
        buys[to] = {amount : BigNumber.from(amount), original: true}
      else {
        buys[to].amount = buys[to].amount.add(BigNumber.from(amount))
      }
      buysTotal = buysTotal.add(BigNumber.from(amount))
    } else {
      //if(distributorAddresses.includes(from)) console.log("PAAAAAS BOOOOOOOOOOOOOOON")
      if(buys[from]) {
        console.log("transfer detected")
        if(buys[to]) {
          console.log("oops")
        } else {
          buys[to] = {amount : BigNumber.from("0"), original: false}
        }
        if(BigNumber.from(amount).gt(buys[from].amount)) {
          console.log("amount override")
          amount = buys[from].amount;
        }
        buys[from].amount = buys[from].amount.sub(BigNumber.from(amount));
        buys[to] = {amount : buys[to].amount.add(BigNumber.from(amount)), original: false}

        console.log("new from balance", buys[from].amount.toString())
        if(buys[from].amount.eq(BigNumber.from("0")))
          delete buys[from];
      }
    }
  })
  let total = BigNumber.from("0");

  let accounts = []
  let amounts = []

  Object.keys(buys).forEach(function(key,index) {
    console.log(key, index)
    total = total.add(buys[key].amount);
    if(distributorAddresses.includes(key)) console.log("error")
    accounts.push(key);
    amounts.push(buys[key].amount.toString())
  });

  Object.keys(buys).forEach(async function(key,index) {
    const balance = await fetchTokenBalance(key);
    if(buys[key].amount.toString() != balance.toString()) {
      console.log("balance mismatch", key, buys[key].amount.toString(), balance.toString())
    }
  });

  console.log("total", total.toString(), buysTotal.toString(), accounts.length, amounts.length)

  total = total.sub(BigNumber.from("114688000000000000000000"));
  console.log("new total", total)

  fs.writeFileSync("final phase.json", JSON.stringify({accounts, amounts}), 'utf-8');

  //1,457,713.16

  //onsole.log(buys);
  
  
  // const transfers = result.map(transfer => {
  //   return {
  //     from: web3.eth.abi.decodeParameter("address", transfer.topics[1]),
  //     to: web3.eth.abi.decodeParameter("address", transfer.topics[2]),
  //     value: web3.eth.abi.decodeParameter("uint256", transfer.data),
  //     time: parseInt(transfer.timeStamp,16)
  //   }
  // })
}

main();