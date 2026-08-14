import { AppLogo } from './AppLogo';
import './PageLoading.css';

type PageLoadingProps = {
  message: string;
};

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="page-loading">
      <AppLogo size="md" className="page-loading__logo" />
      <p>{message}</p>
    </div>
  );
}
