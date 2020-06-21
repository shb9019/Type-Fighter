pragma solidity >=0.4.21 <0.7.0;
pragma experimental ABIEncoderV2;
import './ECDSA.sol';

contract Adjudicator {
    address public owner;

    struct Channel {
        address alice;
        address bob;
        uint256 channelNonce;
    }

    enum StateType {
        PRE_FUND_SETUP,
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
        StateType stateType;
        Channel channel;
        uint8 turnNum;
        Resolution resolution;
        uint timestamp;
    }

    struct ChannelFund {
        bool hasAliceFunded;
        bool hasBobFunded;
        Resolution resolution;
        bool isSet;
        bool isFunded;
    }

    struct Signature {
        address signer;
        bytes signature;
    }

    struct Move {
        State state;
        Signature signature;
    }

    mapping(bytes32 => ChannelFund) public channelFunds;

    function hash(Channel memory channel) pure public returns (bytes32) {
        return keccak256(abi.encode(
            channel.alice,
            channel.bob,
            channel.channelNonce
        ));
    }

    function hash(State memory state) pure public returns (bytes32) {
        return keccak256(abi.encode(
            state.stateType,
            state.channel,
            state.turnNum,
            state.resolution,
            state.timestamp
        ));
    }

    using ECDSA for bytes32;
    function isSigned(bytes32 msgHash, Signature memory signature) public pure returns (bool) {
        return (msgHash.toEthSignedMessageHash().recover(signature.signature) == signature.signer);
    }

    function createChannel(Move memory preFundSetup, Move memory preFundSetupAck) public payable {
        bool aliceBegan = (
            preFundSetup.signature.signer == preFundSetup.state.channel.alice
            && preFundSetupAck.signature.signer == preFundSetup.state.channel.bob
            && preFundSetup.signature.signer == msg.sender
        );

        bool bobBegan = (
            preFundSetupAck.signature.signer == preFundSetup.state.channel.alice
            && preFundSetup.signature.signer == preFundSetup.state.channel.bob
            && preFundSetup.signature.signer == msg.sender
        );

        require(aliceBegan || bobBegan);
        require(
            isSigned(hash(preFundSetup.state), preFundSetup.signature)
            && isSigned(hash(preFundSetupAck.state), preFundSetupAck.signature)
        );

        require(preFundSetup.state.stateType == StateType.PRE_FUND_SETUP);
        require(preFundSetup.state.turnNum == 0);
        require(hash(preFundSetup.state) == hash(preFundSetupAck.state));

        if (aliceBegan) {
            require(msg.value == preFundSetup.state.resolution.aliceAmount);
        } else {
            require(msg.value == preFundSetup.state.resolution.bobAmount);
        }

        Channel memory channel = preFundSetup.state.channel;
        bytes32 channelHash = hash(channel);

        if (channelFunds[channelHash].isSet) {
            if (aliceBegan) {
                require(channelFunds[channelHash].hasAliceFunded == false);
                channelFunds[channelHash].hasAliceFunded = true;
                channelFunds[channelHash].resolution.aliceAmount = msg.value;
                channelFunds[channelHash].isFunded = true;
            } else {
                require(channelFunds[channelHash].hasBobFunded == false);
                channelFunds[channelHash].hasBobFunded = true;
                channelFunds[channelHash].resolution.bobAmount = msg.value;
                channelFunds[channelHash].isFunded = true;
            }
        } else {
            channelFunds[channelHash].isSet = true;
            if (aliceBegan) {
                channelFunds[channelHash].hasAliceFunded = true;
                channelFunds[channelHash].hasBobFunded = false;
                channelFunds[channelHash].resolution.aliceAmount = msg.value;
                channelFunds[channelHash].resolution.bobAmount = 0;
            } else {
                channelFunds[channelHash].hasAliceFunded = false;
                channelFunds[channelHash].hasBobFunded = true;
                channelFunds[channelHash].resolution.aliceAmount = 0;
                channelFunds[channelHash].resolution.bobAmount = msg.value;
            }
        }
    }

    function validTransition(State memory fromState, State memory toState) pure public returns (bool) {
        if (hash(fromState.channel) != hash(toState.channel)) {
            return false;
        }

        return true;
    }
}
