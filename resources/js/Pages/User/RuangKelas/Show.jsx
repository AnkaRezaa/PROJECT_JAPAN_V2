import React from 'react';
import { Head } from '@inertiajs/react';
import LiveClassRoom from '@/Components/Features/Presentation/LiveClassRoom';
import GuidedTour from '@/Components/Features/Onboarding/GuidedTour';

export default function Show(props) {
    return (
        <>
            <Head title={`Kelas Live - ${props.session.program.title}`} />
            <LiveClassRoom {...props} role="student" deck={props.session.deck} />
            <GuidedTour pageKey="live_room" />
        </>
    );
}
