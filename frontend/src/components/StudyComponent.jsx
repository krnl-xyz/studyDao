import React from 'react';

const StudyComponent = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-4">I am a component</h1>
        <p className="text-gray-700 text-center">
          This is a simple test component that can be imported in other screens.
        </p>
      </div>
    </div>
  );
};

export default StudyComponent;