pragma solidity >=0.4.21 <0.7.0;
pragma experimental ABIEncoderV2;

contract Adjudicator {
    address public owner;

    struct Channel {
        address alice;
        address bob;
        uint256 channelNonce;
    }

    enum StateType {
        PRE_FUND_SETUP,
        PRE_FUND_SETUP_ACK,
        POST_FUND_SETUP,
        POST_FUND_SETUP_ACK,
        Game,
        Conclude
    }

    struct Resolution {
        uint aliceAmount;
        uint bobAmount;
    }

    struct State {
        Channel channel;
        uint8 turnNum;
        Resolution resolution;
    }

    struct ChannelFunds {
        bool aliceFunded;
        bool bobFunded;
        Resolution resolution;
    }

    struct Signature {
        address signer;
        uint256 sign;
    }

    struct Move {
        State state;
        Signature signature;
    }

    function hash(Channel memory channel) pure public returns (bytes32) {
        return keccak256(abi.encode(
            channel.alice,
            channel.bob,
            channel.channelNonce
        ));
    }

    function hash(State memory state) pure public returns (bytes32) {
        return keccak256(abi.encode(state.channel, state.turnNum, state.resolution));
    }

    function createChannel(Move preFundSetup, Move preFundSetupAck) pure public {
        require(validMove(move1, move2));

        bool aliceBegan = (
            preFundSetup.signature.signer == preFundSetup.state.channel.alice
            && preFundSetupAck.signature.signer == preFundSetup.state.channel.bob
        );

        bool bobBegan = (
            preFundSetupAck.signature.signer == preFundSetup.state.channel.alice
            && preFundSetup.signature.signer == preFundSetup.state.channel.bob
        );

        require(aliceBegan || bobBegan);
    }

    function validTransition(State memory fromState, State memory toState) pure public returns (bool) {
        if (hash(fromState.channel) != hash(toState.channel)) {
            return false;
        }

        return true;
    }
}
