export default function BrandWordmark({ className = 'h-8', light = false, adaptive = true }) {
    return <span className={`inline-flex shrink-0 items-center ${className}`}>
        <img src="/images/logos/tokuup-wordmark.png" alt="TokuUp" className={`h-full w-auto max-w-full object-contain ${light ? 'hidden' : adaptive ? 'dark:hidden' : ''}`} />
        <img src="/images/logos/tokuup-wordmark-dark.png" alt={light ? 'TokuUp' : ''} aria-hidden={light ? undefined : true} className={`h-full w-auto max-w-full object-contain ${light ? '' : adaptive ? 'hidden dark:block' : 'hidden'}`} />
    </span>;
}
