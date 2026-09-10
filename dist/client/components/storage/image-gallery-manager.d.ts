export type ImageGalleryManagerProps = {
    referenceId: string;
    initialImageIds: string[];
    accept?: string;
    purpose?: string;
    maxFileSizeMb?: number;
    onSaved: (imageIds: string[]) => void;
    /** Attach the uploaded file ids to a parent record/table. Called with
     *  `(referenceId, nextImageIds)`; must return the list of saved ids — the
     *  component sets its selection state from the returned list. */
    onPersist: (referenceId: string, nextImageIds: string[]) => Promise<Array<string | number>>;
};
export declare function ImageGalleryManager({ referenceId, initialImageIds, accept, purpose, maxFileSizeMb, onSaved, onPersist, }: ImageGalleryManagerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=image-gallery-manager.d.ts.map