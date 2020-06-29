import Web3 from "web3";
import Adjudicator from "./contracts/Adjudicator.json";

const options = {
    web3: {
        block: false,
        customProvider: new Web3("http://localhost:8545"),
    },
    contracts: [Adjudicator],
    events: {},
};

export default options;