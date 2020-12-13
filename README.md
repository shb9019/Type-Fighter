# Type Fighter

A TypeRacer clone built on the Ethereum BlockChain and making off-chain
computations for instant finality using State Channels. This application 
is modelled as a force move game. Read more [here](https://magmo.com/force-move-games.pdf).

## Requirements

1. Truffle
1. Truffle HD Wallet Provider
1. Ganache CLI
1. Node v10.16+

## Setup

### BlockChain

```
git clone https://github.com/shb9019/Type-Fighter.git
cd Type-Fighter
npm install
```
Start the local blockchain for testing
```
ganache-cli -p 8545 
```
Set config values in `test/config.js`
```
truffle compile
truffle test # Make sure all tests pass
truffle deploy
```

### FrontEnd

```
cd client/
npm install
npm start
```

### Backend

```
cd server/
npm install
npm start
```