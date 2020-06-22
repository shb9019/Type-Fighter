const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys} = require("./config");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const encodeParam = (type, value) => {
    return web3.eth.abi.encodeParameter(type, value);
}

const createTestChannel = async (adjudicator) => {
    const alicePublicKey = aliceKeys.public;
    const alicePrivateKey = aliceKeys.private;

    const bobPublicKey = bobKeys.public;
    const bobPrivateKey = bobKeys.private;

    const preFundSetupType = encodeParam('uint8', 0);
    const channelNonce = encodeParam('uint256', 9);
    const channel = [alicePublicKey, bobPublicKey, channelNonce];
    const channelHash = await adjudicator.methods['hash((address,address,uint256))'].call(channel);
    const turnNum = encodeParam('uint256', 0);
    const aliceResolution = encodeParam('uint256', 5000000);
    const bobResolution = encodeParam('uint256', 5000000);
    const resolutions = [aliceResolution, bobResolution];
    const timestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
    const opponent_timestamp = encodeParam('uint256', 0);
    const stake = encodeParam('uint256', 10);
    const play = [encodeParam('uint256', 18)];

    const state = [preFundSetupType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
    const stateHash = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call(state);

    let aliceSignature = await web3.eth.accounts.sign(stateHash, alicePrivateKey);
    let bobSignature = await web3.eth.accounts.sign(stateHash, bobPrivateKey);

    aliceSignature = [alicePublicKey, aliceSignature.signature];
    bobSignature = [bobPublicKey, bobSignature.signature];

    await adjudicator.methods['createChannel(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)),(address,bytes)))'].sendTransaction(
        [state, aliceSignature],
        [state, bobSignature], {
            from: alicePublicKey,
            value: 5000000
        });

    await adjudicator.methods['createChannel(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)),(address,bytes)))'].sendTransaction(
        [state, bobSignature],
        [state, aliceSignature], {
            from: bobPublicKey,
            value: 5000000
        });

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

contract("Force Move from PreFundSetup to PostFundSetup", async accounts => {
    it("should transfer funds back", async () => {
        let adjudicator = await Adjudicator.deployed();
        const BN = web3.utils.BN;
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator);

        const initialAliceBalance = parseInt(await web3.eth.getBalance(aliceKeys.public));
        const initialBobBalance = parseInt(await web3.eth.getBalance(bobKeys.public));

        const postFundSetupType = encodeParam('uint8', 1);
        const channel = alicePreFundSetupMove.state[1];
        const turnNum = encodeParam('uint256', 0);
        const aliceResolution = encodeParam('uint256', 5000000);
        const bobResolution = encodeParam('uint256', 5000000);
        const resolutions = [aliceResolution, bobResolution];
        const timestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const opponent_timestamp = bobPreFundSetupMove.state[4];
        const stake = encodeParam('uint256', 0);
        const play = [encodeParam('uint256', 0)];

        const postFundSetupstate = [postFundSetupType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
        const postFundSetupstateHash = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call(postFundSetupstate);

        let aliceSignature = await web3.eth.accounts.sign(postFundSetupstateHash, aliceKeys.private);
        aliceSignature = [aliceKeys.public, aliceSignature.signature];

        let aliceGasCost = 0;
        const gasPrice = await web3.eth.getGasPrice();

        try {
            const tx = await adjudicator.methods['forceMove(((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)),(address,bytes)),((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)),(address,bytes)))'].sendTransaction(
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature],
                [postFundSetupstate, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            const gasUsed = tx.receipt.gasUsed;
            const txFee = gasPrice * gasUsed;

            aliceGasCost += txFee;
        } catch(err) {
            console.log(err.toString());
            assert(false, "Force Move failed!");
        }

        const channelHash = await adjudicator.methods['hash((address,address,uint256))'].call(channel);

        try {
            const challenge = await adjudicator.methods['challenges(bytes32)'].call(channelHash);

            assert(challenge.isSet === true, "Challenge should not be set");
            assert(challenge.isExpired === false, "Challenge should not be expired yet");
            assert(challenge.challengerMove.signature.signer === aliceKeys.public, "Wrong signature signer for challenger move");
            assert(challenge.opponentMove.signature.signer === bobKeys.public, "Wrong signature signer for opponent move");
            assert(challenge.challengerMove.signature.signature === aliceSignature[1], "Wrong signature");
            assert(challenge.opponentMove.signature.signature === bobPreFundSetupMove.signature[1], "Wrong signature");
        } catch (err) {
            assert(false, "Challenge is not setup");
        }

        await sleep(3000);

        try {
            const tx = await adjudicator.methods['redeemResolution(bytes32)'].sendTransaction(channelHash);
            const gasUsed = tx.receipt.gasUsed;
            const txFee = gasPrice * gasUsed;
            aliceGasCost += txFee;

            const finalAliceBalance = parseInt(await web3.eth.getBalance(aliceKeys.public));
            const finalBobBalance = parseInt(await web3.eth.getBalance(bobKeys.public));

            assert.equal(((finalBobBalance / 1000000) - (initialBobBalance / 1000000)), 5, "Bob is not receiving back correct amount");
            assert.equal(((finalAliceBalance / 1000000) - (initialAliceBalance / 1000000) + (aliceGasCost / 1000000)), 5, "Alice is not receiving back correct amount");
        } catch (err) {
            console.log(err.toString());
        }
    });
});
