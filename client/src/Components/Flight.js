import React from 'react';
import blueFlight from "../images/flight_blue.png";
import redFlight from "../images/flight_red.png";
import dottedLine from '../images/dotted.png';

function Flight(props) {
    const {self} = props;
    return (
        <div className={'flight-div'}>
            <img className={'flight-img'}
                 src={self ? blueFlight : redFlight}
                 alt={'Self'}
                 height={50}
                 width={'auto'}
            />
            <img className={'flight-line'} src={dottedLine} alt={'Self'} height={50} width={'100%'}/>
        </div>
    );
}

export default Flight;