const {methodSignatures} = require("./config");

const Adjudicator = artifacts.require('Adjudicator');

contract("Hash Channel Test", async accounts => {
    it("should return same channel hash", async () => {
        let channel1 = {}, channel2 = {};

        channel1.alice = accounts[0];
        channel1.bob = accounts[1];
        channel1.channelNonce = 1;

        channel2 = channel1;

        let adjudicator = await Adjudicator.deployed();
        let hash1 = "1", hash2 = "2";
        try {
            hash1 = await adjudicator.methods[methodSignatures.channelHash].call([
                accounts[0],
                accounts[1],
                web3.eth.abi.encodeParameter('uint256', 1)
            ]);

            hash2 = await adjudicator.methods[methodSignatures.channelHash].call([
                accounts[0],
                accounts[1],
                web3.eth.abi.encodeParameter('uint256', 1)
            ]);
        } catch (err) {
            console.log(err);
        }
        assert.equal(hash1, hash2, "Channel Hashes do not match!");
    });

    it("should not return same channel hash", async () => {
        let channel1 = {}, channel2 = {};

        channel1.alice = accounts[0];
        channel1.bob = accounts[1];
        channel1.channelNonce = 1;

        channel2.alice = accounts[1];
        channel2.bob = accounts[0];
        channel2.channelNonce = channel1.channelNonce;

        let adjudicator = await Adjudicator.deployed();
        let hash1 = "1", hash2 = "2";
        try {
            hash1 = await adjudicator.methods[methodSignatures.channelHash].call([
                channel1.alice,
                channel1.bob,
                web3.eth.abi.encodeParameter('uint256', channel1.channelNonce)
            ]);

            hash2 = await adjudicator.methods[methodSignatures.channelHash].call([
                channel2.alice,
                channel2.bob,
                web3.eth.abi.encodeParameter('uint256', channel2.channelNonce)
            ]);
        } catch (err) {
            console.log(err);
        }
        assert.notEqual(hash1, hash2, "Channel Hashes do not match!");
    });
});
