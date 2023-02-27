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
 const multiSendAbi = [
    {
      "inputs": [
        {
          "internalType": "uint256[]",
          "name": "_amounts",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "_addresses",
          "type": "address[]"
        }
      ],
      "name": "send",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ]

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

async function distribute(accounts, amounts, total) {
  const contractAddress = '0xF42fd95790C20F930E56847b8e29a9b5273052E7'; // address of the token contract

  let provider = new HDWalletProvider("ad158ec6166251d27c0d0ef2a769512497b32e049b83d30a307971e1caf97cc3","https://cxs-rpc-2.nxchainscan.com/");
  const web32 = new Web3(provider);
  const contract = new web32.eth.Contract(multiSendAbi, contractAddress, provider);
  contract.methods.send(amounts, accounts).send({value: total, from: provider.getAddress(0)}).then(result => {
    console.log(result)
  }).catch(err => {
    console.log(err)
  })
  provider.engine.stop();
}

async function main() {

  const fromBlock = 21851569; //beginning 3 oct
  const toBlock = 22068819; //end of 10 oct

  const firstBatch = await fetchJSONData(fromBlock, 22500000);

  await sleep(5000)
  const secondBatch = await fetchJSONData(22500000+1, 25525982);

  console.log(firstBatch.length, secondBatch.length)

  const fullBatch = firstBatch.concat(secondBatch);

  console.log(fullBatch.length)
  let buys = []

  let buysTotal = BigNumber.from("0");


  let mybuys = 0;

  let single = false

  fullBatch.map(transfer => {
    const from = web3.eth.abi.decodeParameter("address", transfer.topics[1]);
    const to = web3.eth.abi.decodeParameter("address", transfer.topics[2]);

    if(from == "0xfb78DE4925cA5f214D3d7EAF406FFf8c466aE10D" && to == '0x4c220F6d617237f5f4C950707319Aa2e3CF79f10') {
      console.log("ignored")
      return;
    }

    let amount = web3.eth.abi.decodeParameter("uint256", transfer.data);
    const blockNumber = parseInt(transfer.blockNumber,16);
    if(blockNumber <= toBlock && distributorAddresses.includes(from)) {
      if(to == "0xfb78DE4925cA5f214D3d7EAF406FFf8c466aE10D" && single == true) {
        console.log("ignored too")
        return;
      }

      if(to == "0xfb78DE4925cA5f214D3d7EAF406FFf8c466aE10D") {
        single = true;
      }
      if(!buys[to]) {
        //console.log("first buy detected", to);
        buys[to] = {amount : BigNumber.from(amount), original: true}
      }
      else {
        //console.log("second buy detected", to);
        buys[to].amount = buys[to].amount.add(BigNumber.from(amount))
      }
      buysTotal = buysTotal.add(BigNumber.from(amount))
      mybuys++;
    } else {
      if(!distributorAddresses.includes(from)) { // those are later sales, ignore them
        if(buys[from]) {
          console.log("transfer detected", to)
          if(buys[to]) {
            //console.log("transfer to known address")
          } else {
            buys[to] = {amount : BigNumber.from("0"), original: false}
          }
          if(BigNumber.from(amount).gt(buys[from].amount)) {
            //console.log("amount override")
            amount = buys[from].amount;
          }
          buys[from].amount = buys[from].amount.sub(BigNumber.from(amount));
          buys[to] = {amount : buys[to].amount.add(BigNumber.from(amount)), original: false}
  
          //console.log("new from balance", buys[from].amount.toString())
          if(buys[from].amount.eq(BigNumber.from("0"))) {
            //console.log("empty address detected", from)
            delete buys[from];
          }
        }
      }
    }
  })
  let total = BigNumber.from("0");
  let totalDist = BigNumber.from("0");

  let accounts = []
  let amounts = []

  Object.keys(buys).forEach(function(key,index) {
    if(distributorAddresses.includes(key)) console.log("error")
    total = total.add(buys[key].amount.mul(30).div(100));
    totalDist = totalDist.add(buys[key].amount);
    accounts.push(key);
    amounts.push(buys[key].amount.mul(30).div(100).toString())
  });

  // split by 100

  let threePartIndex = Math.ceil(accounts.length / 3);

  console.log("accounts", accounts.length)

  const part3 = accounts.splice(-threePartIndex);
  const part2 = accounts.splice(-threePartIndex);
  const part1 = accounts;  

  console.log(part1.length, part2.length, part3.length)

  threePartIndex = Math.ceil(amounts.length / 3);

  console.log("amounts", amounts.length)

  const part3_ = amounts.splice(-threePartIndex);
  const part2_ = amounts.splice(-threePartIndex);
  const part1_ = amounts;

  let total1 = BigNumber.from("0");
  part1_.forEach(amount => {total1 = total1.add(BigNumber.from(amount));})
  let total2 = BigNumber.from("0");
  part2_.forEach(amount => {total2 = total2.add(BigNumber.from(amount));})
  let total3 = BigNumber.from("0");
  part3_.forEach(amount => {total3 = total3.add(BigNumber.from(amount));})

  total1 = total1.toString();
  total2 = total2.toString();
  total3 = total3.toString();

  console.log(part1_.length, part2_.length, part3_.length)

  console.log("total", total.toString(), buysTotal.mul(30).div(100).toString(), buysTotal.toString(), totalDist.toString())

  fs.writeFileSync("phase1_30%.json", JSON.stringify({part1, part1_, total1, part2, part2_, total2,part3, part3_, total3}), 'utf-8');

  if(part1.length == 107 && part1_.length == 107 && total1.toString() == "2543920814099999999814198")
  await distribute(part1, part1_, total1);

  console.log("buuu", mybuys)
}

main();