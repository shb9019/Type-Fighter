const Adjudicator = artifacts.require('Adjudicator');

const encodeParam = (type, value) => {
    return web3.eth.abi.encodeParameter(type, value);
}

contract("Create Channel Test", async accounts => {
    it("should create correct signature", async () => {
        const publicKey = "0x2d7210fd63c69583be497f2d70188EAb8a2B7945";
        const privateKey = "0x8611019bd1f24cc075429326ccda5866eb66de54775b1a1b183358b4700ed1c6";

        let adjudicator = await Adjudicator.deployed();

        let stateHash = await adjudicator.methods['hash(((address,address,uint256),uint8,(uint256,uint256)))'].call([
            [accounts[0], accounts[1], encodeParam('uint256', 1)],
            encodeParam('uint256', 10),
            [encodeParam('uint256', 11), encodeParam('uint256', 10)]
        ]);

        let signature = await web3.eth.accounts.sign(stateHash, privateKey);
        let address = web3.eth.accounts.recover(stateHash, signature.v, signature.r, signature.s);

        assert.equal(publicKey, address);
    });

    it("should succeed", async () => {
        let adjudicator = await Adjudicator.deployed();

        const alicePublicKey = accounts[0];
        const alicePrivateKey = "0x8611019bd1f24cc075429326ccda5866eb66de54775b1a1b183358b4700ed1c6";

        const bobPublicKey = accounts[1];
        const bobPrivateKey = "0xbeb87e74111d6b61a61faec813c48a7e43f0f92d5d76906c3c44e1e215bcf5ab";

        const channelNonce = encodeParam('uint256', 9);
        const channel = [alicePublicKey, bobPublicKey, channelNonce];
        const turnNum = encodeParam('uint256', 9);
        const aliceResolution = encodeParam('uint256', 10);
        const bobResolution = encodeParam('uint256', 10);
        const resolutions = [aliceResolution, bobResolution];

        const state = [channel, turnNum, resolutions];
        const stateHash = await adjudicator.methods['hash(((address,address,uint256),uint8,(uint256,uint256)))'].call(state);

        let aliceSignature = await web3.eth.accounts.sign(stateHash, alicePrivateKey);
        let bobSignature = await web3.eth.accounts.sign(stateHash, bobPrivateKey);

        aliceSignature = [alicePublicKey, aliceSignature.signature];
        bobSignature = [bobPublicKey, bobSignature.signature];

        try {
            await adjudicator.methods['createChannel((((address,address,uint256),uint8,(uint256,uint256)),(address,bytes)),(((address,address,uint256),uint8,(uint256,uint256)),(address,bytes)))'].call(
                [state, aliceSignature],
                [state, bobSignature]
            );

            await adjudicator.methods['createChannel((((address,address,uint256),uint8,(uint256,uint256)),(address,bytes)),(((address,address,uint256),uint8,(uint256,uint256)),(address,bytes)))'].call(
                [state, bobSignature],
                [state, aliceSignature]
            );
            assert(true);
        } catch (err) {
            assert(false, err);
        }
    });
});
