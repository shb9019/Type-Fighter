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
        CONCLUDE
    }

    // @dev Amounts bid by the players
    struct Resolution {
        uint aliceAmount;
        uint bobAmount;
    }

    struct Play {
        uint letterCount;
    }

    // @dev Single state instance - Unique for every move
    struct State {
        StateType stateType;
        Channel channel;
        uint8 turnNum;
        Resolution resolution;
        uint timestamp;
        // Timestamp of opponent's last move
        uint opponent_timestamp;
        // Amount staked in this turn
        uint stake;
        Play play;
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

    struct Challenge {
        Move challengerMove;
        Move opponentMove;
        uint timestamp;
        bool isExpired;
        bool isSet;
    }

    // @dev Mapping of channel Hashes to corresponding funds
    mapping(bytes32 => ChannelFund) public channelFunds;
    // @dev Mapping of channel Hashes to registered Challenges
    mapping(bytes32 => Challenge) public challenges;

    uint public challengeExpirationLimit = 3;

    /**
     * @dev Helper function to compute hash of a channel object
     * @param channel Channel, Channel object to be hashed
     */
    function hash(Channel memory channel) pure public returns (bytes32) {
        return keccak256(abi.encode(channel));
    }

    /**
     * @dev Helper function to compute hash of a state object
     * @param state State, State object to be hashed
     */
    function hash(State memory state) pure public returns (bytes32) {
        return keccak256(abi.encode(state));
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

        require(preFundSetup.state.timestamp <= now && preFundSetupAck.state.timestamp <= now);
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

    /**
     * @dev Check if two state in succession are valid
     * @param fromState State, First State
     * @param toState State, state immediately succeeding fromState
     */
    function validTransition(State memory fromState, State memory toState) public view returns (bool) {
        require(hash(fromState.channel) == hash(toState.channel));

        bool isValid = true;
        if (fromState.stateType == StateType.PRE_FUND_SETUP) {
            if (toState.stateType == StateType.POST_FUND_SETUP) {
                isValid = isValid && (toState.timestamp > fromState.timestamp);
                isValid = isValid && (toState.opponent_timestamp == fromState.timestamp);
                // Control how early the timestamp can be set by a malicious user
                isValid = isValid && (toState.timestamp <= (now + 60));
                isValid = isValid && (fromState.turnNum == toState.turnNum);
            } else if (toState.stateType == StateType.CONCLUDE) {

            } else {
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * @dev Given previous move, check if next move is valid
     * @param opponentMove Move, Opponent participant's move
     * @param selfMove Move, Move to be validated
     */
    function validMove(Move memory opponentMove, Move memory selfMove) public view returns (bool) {
        require(isSigned(hash(opponentMove.state), opponentMove.signature) && isSigned(hash(selfMove.state), selfMove.signature));
        require(
            (opponentMove.signature.signer == opponentMove.state.channel.alice
            && selfMove.signature.signer == selfMove.state.channel.bob)
            || (opponentMove.signature.signer == opponentMove.state.channel.bob
        && selfMove.signature.signer == selfMove.state.channel.alice)
        );

        return validMove(opponentMove, selfMove);
    }

    /**
     * @dev On Chain transaction to force another particiapant to make the next move.
     *      Used when opponent does not respond or responds with an invalid move.
     * @param opponentMove Move, Last signed move of opponent
     * @param selfMove Move, Next move of the sender which opponent does not respond to
     */
    function forceMove(Move memory opponentMove, Move memory selfMove) public view {
        require(selfMove.signature.signer == msg.sender);
        require(validMove(opponentMove, selfMove));

        bytes32 channelHash = hash(opponentMove.state.channel);
        Challenge memory challenge = challenges[channelHash];

        require(challenge.isSet == false);

        // Check if expired
        if (now >= (challenge.timestamp + challengeExpirationLimit)) {
            challenge.isExpired = true;
            challenges[channelHash].isExpired = true;
        }
        require(challenge.isExpired == false);

        challenge.challengerMove = selfMove;
        challenge.opponentMove = opponentMove;
        challenge.timestamp = now;
        challenge.isExpired = false;
        challenge.isSet = true;

        challenges[channelHash] = challenge;
    }

    /**
     * @dev Return funds in case opponent does not submit funds but signs prefund setup
     * @param channelHash bytes32, Channel whose challenge is to be redeemed
     */
    function redeemResolution(bytes32 channelHash) public view {
        Challenge memory challenge = challenges[channelHash];
        require(challenge.isSet == true);

        // Check if expired
        if (now >= (challenge.timestamp + challengeExpirationLimit)) {
            challenge.isExpired = true;
            challenges[channelHash].isExpired = true;
        }
        require(challenge.isExpired == true);

        Resolution memory resolution = challenge.opponentMove.state.resolution;
        Channel memory channel = challenge.opponentMove.state.channel;

        address payable alice = address(uint160(channel.alice));
        address payable bob = address(uint160(channel.bob));

        alice.transfer(resolution.aliceAmount);
        bob.transfer(resolution.bobAmount);
    }
}
