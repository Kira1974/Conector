export interface ThStandardResponse<T> {
    message: string;
    code: number;
    data: T;
}
