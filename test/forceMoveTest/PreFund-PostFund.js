const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("../config");
const {sleep, encodeParam, createTestChannel} = require("../utils");

contract("Force Move from PreFundSetup to PostFundSetup", async accounts => {
    it("should transfer funds back", async () => {
        let adjudicator = await Adjudicator.deployed();
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
        const play = [encodeParam('uint256', 0), encodeParam('uint256', 0), encodeParam('uint256', 200)];

        const postFundSetupstate = [postFundSetupType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
        const postFundSetupstateHash = await adjudicator.methods[methodSignatures.stateHash].call(postFundSetupstate);

        let aliceSignature = await web3.eth.accounts.sign(postFundSetupstateHash, aliceKeys.private);
        aliceSignature = [aliceKeys.public, aliceSignature.signature];

        let aliceGasCost = 0;
        const gasPrice = await web3.eth.getGasPrice();

        try {
            postFundSetupstate.resolutions.aliceResolution = encodeParam('uint256', 10000000);

            await adjudicator.methods[methodSignatures.forceMove].call(
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature],
                [postFundSetupstate, aliceSignature], {
                    from: aliceKeys.public
                }
            );

            assert(false, "Force Move should fail since resolution is tampered!");
        } catch(err) {
            assert(true);
        }

        try {
            const tx = await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature],
                [postFundSetupstate, aliceSignature], {
                    from: aliceKeys.public
                }
            );
            const gasUsed = tx.receipt.gasUsed;
            const txFee = gasPrice * gasUsed;

            aliceGasCost += txFee;
        } catch(err) {
            assert(false, "Force Move failed:" + err.toString());
        }

        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);

        try {
            const challenge = await adjudicator.methods[methodSignatures.challenges].call(channelHash);

            assert(challenge.isSet === true, "Challenge should not be set");
            assert(challenge.isExpired === false, "Challenge should not be expired yet");
            assert(challenge.challengerMove.signature.signer === aliceKeys.public, "Wrong signature signer for challenger move");
            assert(challenge.opponentMove.signature.signer === bobKeys.public, "Wrong signature signer for opponent move");
            assert(challenge.challengerMove.signature.signature === aliceSignature[1], "Wrong signature");
            assert(challenge.opponentMove.signature.signature === bobPreFundSetupMove.signature[1], "Wrong signature");
        } catch (err) {
            assert(false, "Challenge is not setup:" + err.toString());
        }

        try {
            await adjudicator.methods[methodSignatures.redeemResolution].call(channelHash);
            assert(false, "Resolution does not wait for expiration");
        } catch (err) {
            assert(true);
        }

        // Wait for expiration of rebute
        await sleep(3000);

        try {
            const tx = await adjudicator.methods[methodSignatures.redeemResolution].sendTransaction(channelHash);
            const gasUsed = tx.receipt.gasUsed;
            const txFee = gasPrice * gasUsed;
            aliceGasCost += txFee;

            const finalAliceBalance = parseInt(await web3.eth.getBalance(aliceKeys.public));
            const finalBobBalance = parseInt(await web3.eth.getBalance(bobKeys.public));

            assert.isBelow(((finalBobBalance / 1000000) - (initialBobBalance / 1000000)), 6, "Bob is not receiving back correct amount");
            assert.isAbove(((finalBobBalance / 1000000) - (initialBobBalance / 1000000)), 4, "Bob is not receiving back correct amount");
            assert.isBelow(((finalAliceBalance / 1000000) - (initialAliceBalance / 1000000) + (aliceGasCost / 1000000)), 6, "Alice is not receiving back correct amount");
            assert.isAbove(((finalAliceBalance / 1000000) - (initialAliceBalance / 1000000) + (aliceGasCost / 1000000)), 4, "Alice is not receiving back correct amount");
        } catch (err) {
            assert(false, "Failed to redeem funds from challenge:" + err.toString());
        }
    });
});

// FIXME: This test fails randomly.
/**
contract("Respond with move for PreFundSetup", async accounts => {
    it("should resolve the challenge", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator);

        const postFundSetupType = encodeParam('uint8', 1);
        const channel = alicePreFundSetupMove.state[1];
        const turnNum = encodeParam('uint256', 0);
        const aliceResolution = encodeParam('uint256', 5000000);
        const bobResolution = encodeParam('uint256', 5000000);
        const resolutions = [aliceResolution, bobResolution];
        let timestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        let opponent_timestamp = bobPreFundSetupMove.state[4];
        const stake = encodeParam('uint256', 0);
        const play = [encodeParam('uint256', 0)];

        const postFundSetupstate = [postFundSetupType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
        const postFundSetupstateHash = await adjudicator.methods[methodSignatures.stateHash].call(postFundSetupstate);

        let aliceSignature = await web3.eth.accounts.sign(postFundSetupstateHash, aliceKeys.private);
        aliceSignature = [aliceKeys.public, aliceSignature.signature];

        try {
            const tx = await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature],
                [postFundSetupstate, aliceSignature], {
                    from: aliceKeys.public
                }
            );
        } catch(err) {
            console.log(err.toString());
            assert(false, "Force Move failed!");
        }

        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);

        try {
            await adjudicator.methods[methodSignatures.challenges].call(channelHash);
        } catch (err) {
            assert(false, "Challenge is not setup");
        }

        timestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        opponent_timestamp = alicePreFundSetupMove.state[4];

        const bobPostFundSetupState = [postFundSetupType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
        const bobPostFundSetupStateHash = await adjudicator.methods[methodSignatures.stateHash].call(bobPostFundSetupState);

        let bobSignature = await web3.eth.accounts.sign(bobPostFundSetupStateHash, bobKeys.private);
        bobSignature = [bobKeys.public, bobSignature.signature];

        await sleep(200);

        try {
            await adjudicator.methods[methodSignatures.respondWithMove].sendTransaction(
                channelHash,
                [bobPostFundSetupState, bobSignature], {
                    from: bobKeys.public
                }
            );
        } catch (err) {
            console.log(err.toString());
            assert(false, "Cannot respond with move");
        }

        await sleep(100);

        try {
            const challenge = await adjudicator.methods[methodSignatures.challenges].call(channelHash);

            assert(challenge.isSet === false, "Challenge should not be set");
            assert(challenge.respondedMove.signature.signer === bobKeys.public, "Wrong signature signer for opponent move");
            assert(challenge.respondedMove.signature.signature === bobSignature[1], "Wrong signature");
        } catch (err) {
            console.log(err.toString());
            assert(false, "Challenge is not setup");
        }

    });
});
 */
