import React, {useState, useEffect} from 'react';
import Peer from 'peerjs';
import {Container, Row} from "react-bootstrap";
import Flight from "./Flight";

function Race(props) {
    const {alice, bob, isMatchingUp, id} = props;
    const [peer, setPeer] = useState(null);

    const isAlice = (alice === id);
    let conn = null;
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let peer = new Peer('' + id, {
            debug: 3,
        });

        peer.on('open', function (id) {
            console.log("My ID is " + id);
        });
        peer.on('error', function (err) {
            console.log('' + err)
        });

        peer.on('connection', function (conn) {
            conn.on('open', function () {
                conn.on('data', function (data) {
                    console.log('Received', data);
                });

                conn.send('Hello from markers-page!');
            });
        });

        setPeer(peer);
    }, []);

    useEffect(() => {
        if ((isMatchingUp === false) && isAlice) {
            console.log(peer);
            conn = peer.connect(bob);
            conn.on('open', function () {
                conn.on('data', function (data) {
                    console.log('Received', data);
                });

                conn.send('Hello from phone!');
            });
            console.log("Trying to connect!");
        }
    }, [isMatchingUp]);

    return (
        <Container>
            <Row className={'player-flights'}>
                <Flight self={true}/>
                <Flight/>
            </Row>
            <Row>
                <p className={'reference-text'}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
                    et
                    dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                    aliquip
                    ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
                    dolore
                    eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
                    deserunt mollit anim id est laborum
                </p>
            </Row>
            <Row>
                <input className={'user-race-input'} type={'text'}/>
            </Row>
        </Container>
    );
}

export default Race;