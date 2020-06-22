const Adjudicator = artifacts.require('Adjudicator');

const encodeParam = (type, value) => {
    return web3.eth.abi.encodeParameter(type, value);
}

contract("State Hash Test", async accounts => {
    it("should return same state hash", async () => {
        let adjudicator = await Adjudicator.deployed();

        let hash1 = "1", hash2 = "2";
        try {
            hash1 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);

            hash2 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);
        } catch (err) {
            console.log(err);
        }

        assert.equal(hash1, hash2, "State Hashes do not match!");
    });

    it("should not return same state hash (Different TurnNum)", async () => {
        let adjudicator = await Adjudicator.deployed();

        let hash1 = "1", hash2 = "1";
        try {
            hash1 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);

            hash2 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 11),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);
        } catch (err) {
            console.log(err);
        }

        assert.notEqual(hash1, hash2, "State Hashes should not match!");
    });

    it("should not return same state hash (Different Channel)", async () => {
        let adjudicator = await Adjudicator.deployed();

        let hash1 = "1", hash2 = "1";
        try {
            hash1 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);

            hash2 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 2)],
                encodeParam('uint256', 11),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);
        } catch (err) {
            console.log(err);
        }

        assert.notEqual(hash1, hash2, "State Hashes should not match!");
    });

    it("should not return same state hash (Different Resolutions)", async () => {
        let adjudicator = await Adjudicator.deployed();

        let hash1 = "1", hash2 = "1";
        try {
            hash1 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 11), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);

            hash2 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 11),
                [encodeParam('uint256', 10), encodeParam('uint256', 11)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);
        } catch (err) {
            console.log(err);
        }

        assert.notEqual(hash1, hash2, "State Hashes should not match!");
    });

    it("should not return same state hash (Different Types)", async () => {
        let adjudicator = await Adjudicator.deployed();

        let hash1 = "1", hash2 = "1";
        try {
            hash1 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 0),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);

            hash2 = await adjudicator.methods['hash((uint8,(address,address,uint256),uint8,(uint256,uint256),uint256,uint256,uint256,(uint256)))'].call([
                encodeParam('uint8', 1),
                [accounts[0], accounts[1], encodeParam('uint256', 1)],
                encodeParam('uint256', 10),
                [encodeParam('uint256', 10), encodeParam('uint256', 10)],
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                encodeParam('uint256', 1),
                [encodeParam('uint256', 1)]
            ]);
        } catch (err) {
            console.log(err);
        }

        assert.notEqual(hash1, hash2, "State Hashes should not match!");
    });

});
