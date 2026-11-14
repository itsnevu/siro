export function assertConfirmedReceipt(receipt,block,head,confirmations){
 if(!Number.isInteger(confirmations)||confirmations<2)throw new Error("At least two confirmations required");
 if(!receipt||receipt.status!=="success"||!block||!/^0x[0-9a-fA-F]{64}$/.test(receipt.blockHash)||block.hash!==receipt.blockHash)throw new Error("Receipt missing, reverted or reorged");
 if(BigInt(head)-BigInt(receipt.blockNumber)+1n<BigInt(confirmations))throw new Error("Receipt has insufficient confirmations");
 return true;
}
