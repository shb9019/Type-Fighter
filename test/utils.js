const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("./config");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const encodeParam = (type, value) => {
    return web3.eth.abi.encodeParameter(type, value);
}

const createTestChannel = async (adjudicator, channelExists) => {
    const alicePublicKey = aliceKeys.public;
    const alicePrivateKey = aliceKeys.private;

    const bobPublicKey = bobKeys.public;
    const bobPrivateKey = bobKeys.private;

    const preFundSetupType = encodeParam('uint8', 0);
    const channelNonce = encodeParam('uint256', 9);
    const channel = [alicePublicKey, bobPublicKey, channelNonce];
    const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);
    const turnNum = encodeParam('uint256', 0);
    const aliceResolution = encodeParam('uint256', 5000000);
    const bobResolution = encodeParam('uint256', 5000000);
    const resolutions = [aliceResolution, bobResolution];
    const timestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const opponent_timestamp = encodeParam('uint256', 0);
    const stake = encodeParam('uint256', 10);
    const play = [encodeParam('uint256', 0), encodeParam('uint256', 0), encodeParam('uint256', 200)];

    const state = [preFundSetupType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
    const stateHash = await adjudicator.methods[methodSignatures.stateHash].call(state);

    let aliceSignature = await web3.eth.accounts.sign(stateHash, alicePrivateKey);
    let bobSignature = await web3.eth.accounts.sign(stateHash, bobPrivateKey);

    aliceSignature = [alicePublicKey, aliceSignature.signature];
    bobSignature = [bobPublicKey, bobSignature.signature];

    if (!channelExists) {
        await adjudicator.methods[methodSignatures.createChannel].sendTransaction(
            [state, aliceSignature],
            [state, bobSignature], {
                from: alicePublicKey,
                value: 5000000
            });

        await adjudicator.methods[methodSignatures.createChannel].sendTransaction(
            [state, bobSignature],
            [state, aliceSignature], {
                from: bobPublicKey,
                value: 5000000
            });
    }

    const aliceMove = {
        state: state,
        signature: aliceSignature
    };

    const bobMove = {
        state: state,
        signature: bobSignature
    }

    return [aliceMove, bobMove];
};

module.exports = {
    sleep,
    encodeParam,
    createTestChannel
};
