export interface PublicErrorBody {
  error: string;
  code: string;
}

export function publicError(error: string, code: string): PublicErrorBody {
  return { error, code };
}
