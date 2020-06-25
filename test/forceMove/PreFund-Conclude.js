const Adjudicator = artifacts.require('Adjudicator');
const {aliceKeys, bobKeys, methodSignatures} = require("../config");
const {sleep, encodeParam, createTestChannel} = require("../utils");

contract("Force Move from PreFundSetup to Conclude", async accounts => {
    it("should transfer funds back", async () => {
        let adjudicator = await Adjudicator.deployed();
        const [alicePreFundSetupMove, bobPreFundSetupMove] = await createTestChannel(adjudicator);

        const concludeType = encodeParam('uint8', 4);
        const channel = alicePreFundSetupMove.state[1];
        const turnNum = encodeParam('uint256', 0);
        const aliceResolution = encodeParam('uint256', 5000000);
        const bobResolution = encodeParam('uint256', 5000000);
        const resolutions = [aliceResolution, bobResolution];
        const timestamp = encodeParam('uint256', Math.floor(new Date() / 1000));
        const opponent_timestamp = bobPreFundSetupMove.state[4];
        const stake = encodeParam('uint256', 0);
        const play = [encodeParam('uint256', 0), encodeParam('uint256', 0), encodeParam('uint256', 200)];

        const concludeSetupState = [concludeType, channel, turnNum, resolutions, timestamp, opponent_timestamp, stake, play];
        const concludeSetupStateHash = await adjudicator.methods[methodSignatures.stateHash].call(concludeSetupState);

        let aliceSignature = await web3.eth.accounts.sign(concludeSetupStateHash, aliceKeys.private);
        aliceSignature = [aliceKeys.public, aliceSignature.signature];

        try {
            await adjudicator.methods[methodSignatures.forceMove].sendTransaction(
                [bobPreFundSetupMove.state, bobPreFundSetupMove.signature],
                [concludeSetupState, aliceSignature], {
                    from: aliceKeys.public
                }
            );
        } catch(err) {
            console.log(err.toString());
            assert(false, "Force Move failed!");
        }

        const channelHash = await adjudicator.methods[methodSignatures.channelHash].call(channel);

        try {
            const challenge = await adjudicator.methods[methodSignatures.challenges].call(channelHash);

            assert(challenge.isSet === true, "Challenge should not be set");
            assert(challenge.isExpired === false, "Challenge should not be expired yet");
            assert(challenge.challengerMove.signature.signature === aliceSignature[1], "Wrong signature");
            assert(challenge.opponentMove.signature.signature === bobPreFundSetupMove.signature[1], "Wrong signature");
        } catch (err) {
            assert(false, "Challenge is not setup");
        }
    });
});
