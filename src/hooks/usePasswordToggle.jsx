import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const usePasswordToggle = () => {
  const [visible, setVisiblity] = useState(false);

  const Icon = visible ? (
    <Eye onClick={() => setVisiblity(visiblity => !visiblity)} />
  ) : (
    <EyeOff onClick={() => setVisiblity(visiblity => !visiblity)} />
  );

  const InputType = visible ? 'text' : 'password';

  return [InputType, Icon];
};

export default usePasswordToggle;
