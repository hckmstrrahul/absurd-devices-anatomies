import {Button as AriaButton,Dialog,DialogTrigger,Modal,ModalOverlay} from 'react-aria-components';
import {XClose,ZoomIn} from '@untitledui/icons';

interface Props {src:string;alt:string;name:string}

export function ReferenceImage({src,alt,name}:Props){
  return <figure>
    <DialogTrigger>
      <AriaButton className="reference-trigger" aria-label={`View ${name} full size`}>
        <img loading="lazy" src={src} alt={alt}/>
        <span className="reference-magnifier" aria-hidden="true"><ZoomIn/></span>
      </AriaButton>
      <ModalOverlay className="reference-overlay" isDismissable>
        <Modal className="reference-modal">
          <Dialog className="reference-dialog" aria-label={`${name} full view`}>
            {({close})=><>
              <AriaButton className="reference-close" aria-label="Close full view" autoFocus onPress={close}><XClose/></AriaButton>
              <img className="reference-full-image" src={src} alt={alt}/>
            </>}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  </figure>;
}
