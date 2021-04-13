import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import Test from './Test';

const client = new ApolloClient({
    uri: process.env.REACT_APP_API + "/graphql",
    cache: new InMemoryCache({
        addTypename: false
    })
});

const App = () =>
    <ApolloProvider client={client}>
        <div>Hello World</div>
        <Test></Test>
    </ApolloProvider>;

export default App;
