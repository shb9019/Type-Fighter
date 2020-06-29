import React, {useState, useEffect} from 'react';
import '../App.css';
import {Button, Row} from 'react-bootstrap';

function Dashboard(props) {
    const {drizzle, drizzleState} = props;
    console.log(drizzle);
    console.log(drizzleState);
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
                <Button variant={'primary'} className={'match-button'}>Start Match</Button>
            </Row>
        </div>
    );
}

export default Dashboard;
