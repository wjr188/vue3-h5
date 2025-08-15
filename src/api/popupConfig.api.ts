import request from '@/utils/request'

export function fetchPopupConfig(type: string) {
  return request.get('popup_config', {
    popup_type: type
  });
}
