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

  const fromBlock = 22068820; //beginning 11 oct
  const toBlock = 23260489; //end of 21 nov

  const firstBatch = await fetchJSONData(fromBlock, 22900000);

  await sleep(5000)
  const secondBatch = await fetchJSONData(22900000+1, toBlock);

  await sleep(5000)
  const thirdBatch = await fetchJSONData(toBlock+1, 25525982);

  console.log(firstBatch.length, secondBatch.length, thirdBatch.length)

  const fullBatch = firstBatch.concat(secondBatch).concat(thirdBatch);

  console.log(fullBatch.length)

  if(firstBatch.length == 1000) return;
  if(secondBatch.length == 1000) return;

  let buys = []

  let buysTotal = BigNumber.from("0");


  let mybuys = 0;

  fullBatch.map(transfer => {
    const from = web3.eth.abi.decodeParameter("address", transfer.topics[1]);
    const to = web3.eth.abi.decodeParameter("address", transfer.topics[2]);
    let amount = web3.eth.abi.decodeParameter("uint256", transfer.data);
    const blockNumber = parseInt(transfer.blockNumber,16);
    if(blockNumber <= toBlock && distributorAddresses.includes(from)) {
      if(!buys[to]) {
        console.log("first buy detected", to);
        buys[to] = {amount : BigNumber.from(amount), original: true}
      }
      else {
        console.log("second buy detected", to);
        buys[to].amount = buys[to].amount.add(BigNumber.from(amount))
      }
      buysTotal = buysTotal.add(BigNumber.from(amount))
      mybuys++;
    } else {
      if(!distributorAddresses.includes(from)) { // those are later sales, ignore them
        if(buys[from]) {
          console.log("transfer detected", to)
          if(buys[to]) {
            console.log("transfer to known address")
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
          if(buys[from].amount.eq(BigNumber.from("0"))) {
            console.log("empty address detected", from)
            delete buys[from];
          }
        }
      }
    }
  })
  let total = BigNumber.from("0");

  let accounts = []
  let amounts = []

  Object.keys(buys).forEach(function(key,index) {
    if(distributorAddresses.includes(key)) console.log("error")
    total = total.add(buys[key].amount.div(2));
    accounts.push(key);
    amounts.push(buys[key].amount.div(2).toString())
  });

  // split by 100

  let threePartIndex = Math.ceil(accounts.length / 6);

  console.log("accounts", accounts.length)

  const part6 = accounts.splice(-threePartIndex);
  const part5 = accounts.splice(-threePartIndex);
  const part4 = accounts.splice(-threePartIndex);
  const part3 = accounts.splice(-threePartIndex);
  const part2 = accounts.splice(-threePartIndex);
  const part1 = accounts;  

  console.log(part1.length, part2.length, part3.length, part4.length, part5.length, part6.length)

  threePartIndex = Math.ceil(amounts.length / 6);

  console.log("amounts", amounts.length)

  const part6_ = amounts.splice(-threePartIndex);
  const part5_ = amounts.splice(-threePartIndex);
  const part4_ = amounts.splice(-threePartIndex);
  const part3_ = amounts.splice(-threePartIndex);
  const part2_ = amounts.splice(-threePartIndex);
  const part1_ = amounts;

  let total1 = BigNumber.from("0");
  part1_.forEach(amount => {total1 = total1.add(BigNumber.from(amount));})
  let total2 = BigNumber.from("0");
  part2_.forEach(amount => {total2 = total2.add(BigNumber.from(amount));})
  let total3 = BigNumber.from("0");
  part3_.forEach(amount => {total3 = total3.add(BigNumber.from(amount));})
  let total4 = BigNumber.from("0");
  part4_.forEach(amount => {total4 = total4.add(BigNumber.from(amount));})
  let total5 = BigNumber.from("0");
  part5_.forEach(amount => {total5 = total5.add(BigNumber.from(amount));})
  let total6 = BigNumber.from("0");
  part6_.forEach(amount => {total6 = total6.add(BigNumber.from(amount));})

  total1 = total1.toString();
  total2 = total2.toString();
  total3 = total3.toString();
  total4 = total4.toString();
  total5 = total5.toString();
  total6 = total6.toString();

  console.log(part1_.length, part2_.length, part3_.length, part4_.length, part5_.length, part6_.length)

  console.log("total", total.toString(), buysTotal.toString())

  fs.writeFileSync("phase2_50%.json", JSON.stringify({part1, part1_, total1, part2, part2_, total2,part3, part3_, total3, part4, part4_,total4, part5, part5_,total5, part6, part6_,total6}), 'utf-8');

  console.log("buuu", mybuys)
}

main();