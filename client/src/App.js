import React from 'react';
import './App.css';
import Dashboard from "./Components/Dashboard";
import { DrizzleContext } from "@drizzle/react-plugin";
import { Drizzle } from "@drizzle/store";
import drizzleOptions from "./drizzleOptions";

const drizzle = new Drizzle(drizzleOptions);

function App() {
  return (
      <DrizzleContext.Provider drizzle={drizzle}>
        <DrizzleContext.Consumer>
          {drizzleContext => {
            const { drizzle, drizzleState, initialized } = drizzleContext;

            if (!initialized) {
              return "Loading..."
            }

            return (
                <Dashboard drizzle={drizzle} drizzleState={drizzleState} />
            )
          }}
        </DrizzleContext.Consumer>
      </DrizzleContext.Provider>
  );
}

export default App;
