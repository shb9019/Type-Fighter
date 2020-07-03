import Web3 from "web3";
import Adjudicator from "./contracts/Adjudicator.json";

const options = {
    web3: {
        block: false,
    },
    contracts: [Adjudicator],
    events: {},
};

export default options;