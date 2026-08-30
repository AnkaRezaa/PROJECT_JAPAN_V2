export default function Card({ children, className = '', padding = true, hover = false }) {
    return (
        <div className={`toku-surface border rounded-lg ${padding ? 'p-6' : ''} ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : 'transition-colors'} ${className}`}>
            {children}
        </div>
    );
}

Card.Header = function Header({ children, className = '' }) {
    return <div className={`mb-4 ${className}`}>{children}</div>;
};

Card.Body = function Body({ children, className = '' }) {
    return <div className={className}>{children}</div>;
};

Card.Footer = function Footer({ children, className = '' }) {
    return <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 ${className}`}>{children}</div>;
};
