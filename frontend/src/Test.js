import React, { useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';

const GET_ACCOUNTS = gql`
    query {
        events {
            name
            attendees {
                account {
                    name
                }
            }
        }
    }
`;

const Test = () => {
    const { loading, error, data } = useQuery(GET_ACCOUNTS);

    useEffect(() => {
        if (data) console.log(data);
    }, [data])

    if (loading) return <div>Loading</div>;
    if (error) return <div>Error</div>;
    return <div>
        {JSON.stringify(data)}
    </div>;
};

export default Test;
