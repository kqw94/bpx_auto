"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backpack_client_1 = require("./backpack_client");

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

//当前年份日期时分秒
function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    var strHour = date.getHours();
    var strMinute = date.getMinutes();
    var strSecond = date.getSeconds();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    if (strHour >= 0 && strHour <= 9) {
        strHour = "0" + strHour;
    }
    if (strMinute >= 0 && strMinute <= 9) {
        strMinute = "0" + strMinute;
    }
    if (strSecond >= 0 && strSecond <= 9) {
        strSecond = "0" + strSecond;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + strHour + seperator2 + strMinute
        + seperator2 + strSecond;
    return currentdate;
}

let successbuy = 0;
let sellbuy = 0;

const get_balance = async (client) => {
    let userbalance = await client.Balance();
    // console.log(userbalance)
    let sol_amt = userbalance.SOL.available + userbalance.SOL.locked 
    let usdc_amt = userbalance.USDC.available + userbalance.USDC.locked
   
    let depth = await client.Depth({symbol: "SOL_USDC"})
    let price = depth['bids'][depth['bids'].length-1][0]
    // console.log(getNowFormatDate(), "sol_usdc的市场当前价格:", price);
    
    let sol_total = sol_amt + usdc_amt /price
    let usdc_total = sol_amt * price + usdc_amt
    return {'SOL': sol_total, 'USDC': usdc_total, 'sol_available': userbalance.SOL.available, 'usdc_available': userbalance.USDC.available}
}

const getPrice = async(client) => {
    let depth = await client.Depth({symbol: "SOL_USDC"})
    let bid = depth["bids"][depth['bids'].length-1][0]
    return bid
}   



const sell = async (client, q) => {
    //获取当前买一价
    let depth = await client.Depth({symbol: "SOL_USDC"})
    let bid = depth["bids"][depth['bids'].length-1][0]
    let quantity = q
    let orderResultAsk = await client.ExecuteOrder({
        orderType: "Limit",
        price: bid.toString(),
        quantity: quantity,
        side: "Ask", //卖
        symbol: "SOL_USDC",
        timeInForce: "IOC"
    })
    if (orderResultAsk?.status == "Filled" && orderResultAsk?.side == "Ask") {
        console.log(getNowFormatDate(), "下入卖单成功");

        console.log(getNowFormatDate(), "订单详情:", `卖出价格:${orderResultAsk.price}, 卖出数量:${orderResultAsk.quantity}, 订单号:${orderResultAsk.id}`);
    } else {
        console.log(getNowFormatDate(), "下入卖单失败");
    }
}

const buy = async (client, q) => {
    //获取当前卖一价
    let depth = await client.Depth({symbol: "SOL_USDC"})
    let ask = depth["asks"][0][0]
    let quantity = q
    let orderResultBid = await client.ExecuteOrder({
        orderType: "Limit",
        price: ask.toString(),
        quantity: quantity,
        side: "Bid", //买
        symbol: "SOL_USDC",
        timeInForce: "IOC"
    })
    if (orderResultBid?.status == "Filled" && orderResultBid?.side == "Bid") {
        console.log(getNowFormatDate(), "下入买单成功");

        console.log(getNowFormatDate(), "订单详情:", `购买价格:${orderResultBid.price}, 购买数量:${orderResultBid.quantity}, 订单号:${orderResultBid.id}`);
    } else {
        console.log(getNowFormatDate(), "下入买单失败");
    }
}


(async () => {
    const apisecret = "";
    const apikey = "";
    const client = new backpack_client_1.BackpackClient(apisecret, apikey);
    
    let userbalance = await get_balance(client)
    console.log('SOL本位', userbalance.SOL, 'U本位', userbalance.USDC)
    let sol_amt_ori = userbalance.SOL
    let usdc_amt_ori = userbalance.USDC
    let i = 0
    while(true) {
        try{
            let nowbalance = await get_balance(client)
            // console.log('nowbalance', nowbalance)
            let sol_amt = nowbalance.SOL
            let sol_available = nowbalance.sol_available
            if(sol_available > 0.2 * sol_amt  && sol_available < 0.8 * sol_amt) {
                await buy(client, (0.1 * sol_amt).toFixed(2))
                // await delay(100)
                await sell(client, (0.1 * sol_amt).toFixed(2))
            }else if(sol_available <= 0.2 * sol_amt){
                await buy(client, (0.3 * sol_amt).toFixed(2))
            }else if(sol_available >= 0.8 * sol_amt){
                await sell(client,(0.3 * sol_amt).toFixed(2))
            }
            
            if (i % 20 == 0 && i != 0){
                let price = await getPrice(client)
                let volume = (price * 0.05 * i * 2).toFixed(2)
                nowbalance = await get_balance(client)
                // console.log('SOL本位', nowbalance.SOL, 'U本位', nowbalance.USDC)
                let sol_amt = nowbalance.SOL
                let usdc_amt = nowbalance.USDC
                console.log('总交易量', volume, 'SOL本位磨损', sol_amt_ori-sol_amt, 'U本位磨损', usdc_amt_ori-usdc_amt)
            }
            i += 1
    }catch(e){
        console.log(getNowFormatDate(), "挂单失败，重新挂单中...")
        await delay(10000)
    }
    }
    
})()


