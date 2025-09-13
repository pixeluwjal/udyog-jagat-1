import React from 'react';

const LoadingState: React.FC = () => (
  <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow-md">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#1938A8]"></div>
    <p className="ml-4 text-gray-700 text-xl mt-4">Loading amazing jobs for you...</p>
  </div>
);

export default LoadingState;