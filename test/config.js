const aliceKeys = {
    public: "0x662Ab152Fb2eF6c45F9E68986fe1B1D2fB1f1A7a",
    private: "0xaebf7f2e67d2a6cfcd4f132c4a7351ec2b623923debab619343eb21ac4a86c4e"
};
const bobKeys = {
    public: "0x78C66684c128A47A453995f5b7E30104c8CC82eF",
    private: "0xa2d122c2eb9ac578ea9d2f66088303afd7426641ece8589c0a59ee10d66bbdbc"
}

const mnemonic = "gun repeat basic govern tunnel siege carpet supreme siege laundry wet become";

const methodSignatures = {
    channelHash: 'hash((address,address,uint256))',
    stateHash: 'hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)))',
    createChannel: 'createChannel(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)))',
    validMove: 'validMove(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)))',
    forceMove: 'forceMove(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)))',
    challenges: 'challenges(bytes32)',
    redeemResolution: 'redeemResolution(bytes32)',
    channelFunds: 'channelFunds(bytes32)',
    respondWithMove: 'respondWithMove(bytes32,((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)))',
    withdrawFunds: 'withdrawFunds(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256,uint256,uint256)),(address,bytes)))'
};

module.exports = {
    aliceKeys,
    bobKeys,
    methodSignatures
};
