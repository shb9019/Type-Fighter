import React, {useState, useEffect} from 'react';
import '../App.css';
import {Button, Row} from 'react-bootstrap';
import Race from "./Race";

const getId = () => {
  return Math.floor((Math.random() * 65535) + 1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const requestPairing = async (id) => {
  const result = await fetch(`http://localhost:3001/${id}`);
  const data = await result.json();
  return [data.alice, data.bob];
};

function Dashboard(props) {
  const {drizzle, drizzleState} = props;
  const [id, setId] = useState(0);
  const [alice, setAlice] = useState(0);
  const [bob, setBob] = useState(0);
  const [isMatchInitiated, setIsMatchInitiated] = useState(false);
  const [isMatchingUp, setIsMatchingUp] = useState(false);

  useEffect(() => {
    const id = getId();
    setId(id);
   }, []);

  const initiateMatch = async () => {
    setIsMatchingUp(true);
    setIsMatchInitiated(true);
    const [alice, bob] = await requestPairing(id);
    setAlice(alice);
    setBob(bob);
    sleep(750);
    setIsMatchingUp(false);
    console.log(alice, bob);
  }

  if (!isMatchInitiated) {
    return (
      <div className={'container dashboard'}>
        <Row className={'title-row'}>
          <div className={'inner-title-row'}>
            <b>Type Fighter</b>
            <p>Check out on&nbsp;
              <a
                target={'_blank'}
                href={'https://github.com/shb9019/type-fighter'}
                rel="noopener noreferrer">
                Github
              </a>
            </p>
          </div>
        </Row>
        <Row className={'match-button-row'}>
          <Button variant={'primary'} className={'match-button'} onClick={initiateMatch}>Start Match</Button>
        </Row>
      </div>
    );
  } else {
    return <Race alice={parseInt(alice)} bob={parseInt(bob)} isMatchingUp={isMatchingUp} id={id}/>;
  }
}

export default Dashboard;
