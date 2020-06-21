pragma solidity >=0.4.21 <0.7.0;
pragma experimental ABIEncoderV2;

import './ECDSA.sol';

contract Adjudicator {
    address public owner;

    // @dev Represents a channel unique for every game
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

    // @dev Amounts bid by the playes
    struct Resolution {
        uint aliceAmount;
        uint bobAmount;
    }

    // @dev Single state instance - Unique for every move
    struct State {
        StateType stateType;
        Channel channel;
        uint8 turnNum;
        Resolution resolution;
        uint timestamp;
    }

    // @dev Initial fund deposited in contract for channel
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

    // @dev State with signature of the hashed state
    struct Move {
        State state;
        Signature signature;
    }

    // @dev Mapping of channels to corresponding funds
    mapping(bytes32 => ChannelFund) public channelFunds;

    /**
     * @dev Helper function to compute hash of a channel object
     * @param channel Channel, Channel object to be hashed
     */
    function hash(Channel memory channel) pure public returns (bytes32) {
        return keccak256(abi.encode(
                channel.alice,
                channel.bob,
                channel.channelNonce
            ));
    }

    /**
     * @dev Helper function to compute hash of a state object
     * @param state State, State object to be hashed
     */
    function hash(State memory state) pure public returns (bytes32) {
        return keccak256(abi.encode(
                state.stateType,
                state.channel,
                state.turnNum,
                state.resolution,
                state.timestamp
            ));
    }

    /**
     * @dev Helper function to check if a given signature is valid for a message hash
     * @param messageHash bytes32, ABI encoded Keccak256 Hash of message/object signed
     * @param signature Signature, Signature and signer data for the given message hash
     */
    using ECDSA for bytes32;
    function isSigned(bytes32 messageHash, Signature memory signature) public pure returns (bool) {
        return (messageHash.toEthSignedMessageHash().recover(signature.signature) == signature.signer);
    }

    /**
     * @dev Helper function to valid opponent player's pre fund setup moves
     * @param preFundSetup Move, Signed move by msg.sender for prefund setup
     * @param preFundSetupAck Signature, Signed move by opponent for prefund setup
     * @param sender address, Address of contract interacting account
     */
    function validatePreFundSetupMoves(Move memory preFundSetup, Move memory preFundSetupAck, address sender) public view {
        bool aliceBegan = (
        preFundSetup.signature.signer == preFundSetup.state.channel.alice
        && preFundSetupAck.signature.signer == preFundSetup.state.channel.bob
        && preFundSetup.signature.signer == sender
        );

        bool bobBegan = (
        preFundSetupAck.signature.signer == preFundSetup.state.channel.alice
        && preFundSetup.signature.signer == preFundSetup.state.channel.bob
        && preFundSetup.signature.signer == sender
        );

        require(aliceBegan || bobBegan);
        require(
            isSigned(hash(preFundSetup.state), preFundSetup.signature)
            && isSigned(hash(preFundSetupAck.state), preFundSetupAck.signature)
        );

        require(preFundSetup.state.stateType == StateType.PRE_FUND_SETUP);
        require(preFundSetup.state.turnNum == 0);
        require(hash(preFundSetup.state) == hash(preFundSetupAck.state));
    }

    /**
     * @dev Initiate a new channel using signed prefund setup messages
     * @param preFundSetup Move, Signed move by msg.sender for prefund setup
     * @param preFundSetupAck Signature, Signed move by opponent for prefund setup
     */
    function createChannel(Move memory preFundSetup, Move memory preFundSetupAck) public payable {
        validatePreFundSetupMoves(preFundSetup, preFundSetupAck, msg.sender);

        bool aliceBegan = (
        preFundSetup.signature.signer == preFundSetup.state.channel.alice
        && preFundSetupAck.signature.signer == preFundSetup.state.channel.bob
        && preFundSetup.signature.signer == msg.sender
        );

        Channel memory channel = preFundSetup.state.channel;
        bytes32 channelHash = hash(channel);

        if (aliceBegan) {
            require(msg.value == preFundSetup.state.resolution.aliceAmount);
        } else {
            require(msg.value == preFundSetup.state.resolution.bobAmount);
        }

        if (channelFunds[channelHash].isSet) {
            if (aliceBegan) {
                require(channelFunds[channelHash].hasAliceFunded == false);
                channelFunds[channelHash].hasAliceFunded = true;:w
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

    /**
     * @dev Return funds in case opponent does not submit funds but signs prefund setup
     * @param preFundSetup Move, Signed move by msg.sender for prefund setup
     * @param preFundSetupAck Signature, Signed move by opponent for prefund setup
     */
    function redeemPreFund(Move memory preFundSetup, Move memory preFundSetupAck) public {
        validatePreFundSetupMoves(preFundSetup, preFundSetupAck, msg.sender);

        Channel memory channel = preFundSetup.state.channel;
        bytes32 channelHash = hash(channel);

        require(channelFunds[channelHash].isSet == true);
        require(channelFunds[channelHash].isFunded == false);
        require(now >= preFundSetup.state.timestamp + 5);
    }
}
